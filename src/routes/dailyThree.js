import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const VALID_PILLARS = ["fuel", "move", "grow"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

/**
 * GET /api/daily-three?day=YYYY-MM-DD (defaults to today)
 * Returns, for every family member, which of fuel/move/grow are completed.
 */
export async function getDailyThree(request, familyId, env) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || todayStr();
  if (!validDay(day)) return errorResponse("day must be formatted YYYY-MM-DD.");

  const db = env.DB;
  const members = await db
    .prepare("SELECT id, display_name, role, color FROM members WHERE family_id = ? ORDER BY created_at ASC")
    .bind(familyId)
    .all();

  const completions = await db
    .prepare("SELECT member_id, pillar FROM daily_pillars WHERE family_id = ? AND day = ?")
    .bind(familyId, day)
    .all();

  const completedByMember = {};
  for (const row of completions.results || []) {
    if (!completedByMember[row.member_id]) completedByMember[row.member_id] = [];
    completedByMember[row.member_id].push(row.pillar);
  }

  const result = (members.results || []).map((m) => ({
    memberId: m.id,
    displayName: m.display_name,
    role: m.role,
    color: m.color,
    completed: completedByMember[m.id] || [],
    wonTheDay: (completedByMember[m.id] || []).length === VALID_PILLARS.length,
  }));

  return json({ ok: true, day, members: result });
}

/**
 * POST /api/daily-three/complete — mark one pillar complete for a member on
 * a given day. Awards exactly 1 star, protected by the (member, pillar,
 * day) unique constraint so it can never be double-awarded for the same day
 * even if the button is clicked twice or the request is retried.
 * Body: { memberId, pillar, day? }
 */
export async function completePillar(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const memberId = body.memberId;
  const pillar = body.pillar;
  const day = body.day && validDay(body.day) ? body.day : todayStr();

  if (!memberId) return errorResponse("memberId is required.");
  if (!VALID_PILLARS.includes(pillar)) return errorResponse("pillar must be fuel, move, or grow.");

  const db = env.DB;
  const member = await db
    .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, familyId)
    .first();
  if (!member) return errorResponse("Family member not found.", 404);

  const already = await db
    .prepare("SELECT id FROM daily_pillars WHERE member_id = ? AND pillar = ? AND day = ?")
    .bind(memberId, pillar, day)
    .first();
  if (already) {
    return errorResponse("Already completed for today — no duplicate star given.", 409);
  }

  // Award the star first (ledger is the source of truth), then record the
  // completion row referencing it.
  const idempotencyKey = `daily-three:${memberId}:${pillar}:${day}`;
  const ledgerId = newId();
  try {
    await db
      .prepare(
        "INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, 1, ?, ?)"
      )
      .bind(ledgerId, familyId, memberId, `Completed ${pillar} for ${day}`, idempotencyKey)
      .run();
  } catch (err) {
    if (String(err.message || err).includes("UNIQUE")) {
      return errorResponse("Already completed for today — no duplicate star given.", 409);
    }
    throw err;
  }

  const completionId = newId();
  await db
    .prepare(
      "INSERT INTO daily_pillars (id, family_id, member_id, pillar, day, star_ledger_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(completionId, familyId, memberId, pillar, day, ledgerId)
    .run();

  // Check if this completes all three for a "You won the day!" moment.
  const allToday = await db
    .prepare("SELECT pillar FROM daily_pillars WHERE member_id = ? AND day = ?")
    .bind(memberId, day)
    .all();
  const wonTheDay = (allToday.results || []).length === VALID_PILLARS.length;

  return json({ ok: true, completionId, pillar, day, wonTheDay });
}
