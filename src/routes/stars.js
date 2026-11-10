import { json, errorResponse, readJson } from "../lib/http.js";
import { POINTS, KUDOS_PER_DAY, awardOnce, isTickableDay } from "../lib/points.js";
import { newId } from "../lib/crypto.js";

const MAX_REASON_LENGTH = 100;

/**
 * GET /api/stars?memberId=... — returns a member's spendable balance,
 * lifetime-earned total, and recent history.
 */
export async function getStars(request, familyId, env) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId");
  if (!memberId) return errorResponse("memberId is required.");

  const db = env.DB;
  const member = await db
    .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, familyId)
    .first();
  if (!member) return errorResponse("Family member not found.", 404);

  const totals = await db
    .prepare(
      `SELECT
         COALESCE(SUM(delta), 0) AS balance,
         COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) AS lifetime_earned
       FROM star_ledger WHERE member_id = ?`
    )
    .bind(memberId)
    .first();

  const history = await db
    .prepare(
      "SELECT id, delta, reason, source_event_id, created_at FROM star_ledger WHERE member_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .bind(memberId)
    .all();

  return json({
    ok: true,
    balance: totals.balance,
    lifetimeEarned: totals.lifetime_earned,
    history: history.results || [],
  });
}

/**
 * POST /api/stars — award (or spend) stars for a member.
 * Body: { memberId, delta, reason, idempotencyKey, sourceEventId? }
 * idempotencyKey must be unique per real-world action (e.g.
 * `${memberId}:${pillar}:${dateISO}`) so the same action can never be
 * awarded twice — duplicate keys are rejected, not silently re-applied.
 */
/**
 * POST /api/stars — Kudos: { memberId, actorId, day }.
 * Locked down so stars can't be "hacked": only a parent can give kudos,
 * never to themselves, always exactly 1 star, at most 2 per child per day.
 * (Habit ticks and family activities earn stars through their own routes.)
 */
export async function awardStars(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");
  const db = env.DB;

  const member = await db.prepare("SELECT id, display_name FROM members WHERE id = ? AND family_id = ?").bind(body.memberId || "", familyId).first();
  if (!member) return errorResponse("Family member not found.", 404);
  const actor = await db.prepare("SELECT id, role FROM members WHERE id = ? AND family_id = ?").bind(body.actorId || "", familyId).first();
  if (!actor || actor.role !== "parent") return errorResponse("Only a parent can give kudos stars.", 403);
  if (actor.id === member.id) return errorResponse("You can't give kudos to yourself.", 400);

  const day = typeof body.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : new Date().toISOString().slice(0, 10);
  if (!isTickableDay(day)) return errorResponse("Kudos can only be given for today.", 400);

  for (let n = 1; n <= KUDOS_PER_DAY; n++) {
    const key = `kudos:${n}:${member.id}:${day}`;
    if (await awardOnce(db, { familyId, memberId: member.id, delta: POINTS.kudos, reason: `Kudos from a parent`, key, newId })) {
      const totals = await db.prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM star_ledger WHERE member_id = ?").bind(member.id).first();
      return json({ ok: true, balance: totals.balance, kudosLeftToday: KUDOS_PER_DAY - n });
    }
  }
  return errorResponse(`${member.display_name} already got ${KUDOS_PER_DAY} kudos today — more tomorrow!`, 400);
}
