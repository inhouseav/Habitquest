import { json, errorResponse, readJson } from "../lib/http.js";
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
export async function awardStars(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const memberId = body.memberId;
  const delta = Number(body.delta);
  const reason = (body.reason || "").trim();
  const idempotencyKey = (body.idempotencyKey || "").trim();
  const sourceEventId = body.sourceEventId || null;

  if (!memberId) return errorResponse("memberId is required.");
  if (!Number.isFinite(delta) || delta === 0 || !Number.isInteger(delta)) {
    return errorResponse("delta must be a non-zero whole number.");
  }
  if (!reason || reason.length > MAX_REASON_LENGTH) {
    return errorResponse(`reason is required (max ${MAX_REASON_LENGTH} characters).`);
  }
  if (!idempotencyKey) return errorResponse("idempotencyKey is required to prevent duplicate awards.");

  const db = env.DB;
  const member = await db
    .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, familyId)
    .first();
  if (!member) return errorResponse("Family member not found.", 404);

  // Never let a spend take a member below zero spendable stars.
  if (delta < 0) {
    const totals = await db
      .prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM star_ledger WHERE member_id = ?")
      .bind(memberId)
      .first();
    if (totals.balance + delta < 0) {
      return errorResponse("Not enough stars for that.", 400);
    }
  }

  const ledgerId = newId();
  try {
    await db
      .prepare(
        "INSERT INTO star_ledger (id, family_id, member_id, delta, reason, source_event_id, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(ledgerId, familyId, memberId, delta, reason, sourceEventId, idempotencyKey)
      .run();
  } catch (err) {
    // UNIQUE constraint on idempotency_key — this exact action was already recorded.
    if (String(err.message || err).includes("UNIQUE")) {
      return errorResponse("This was already awarded — no duplicate star given.", 409);
    }
    throw err;
  }

  const totals = await db
    .prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM star_ledger WHERE member_id = ?")
    .bind(memberId)
    .first();

  return json({ ok: true, entryId: ledgerId, balance: totals.balance });
}
