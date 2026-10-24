import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";

const MAX_TITLE_LENGTH = 80;

/** GET /api/rewards — list this family's reward shop items. */
export async function listRewards(familyId, env) {
  const db = env.DB;
  const rewards = await db
    .prepare("SELECT id, title, star_cost, created_at FROM rewards WHERE family_id = ? ORDER BY star_cost ASC")
    .bind(familyId)
    .all();
  return json({ ok: true, rewards: rewards.results || [] });
}

/** POST /api/rewards — add a new reward to the shop (e.g. set up by a parent). */
export async function createReward(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const title = (body.title || "").trim();
  const starCost = Number(body.starCost);

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
  }
  if (!Number.isInteger(starCost) || starCost <= 0) {
    return errorResponse("Star cost must be a whole number greater than 0.");
  }

  const db = env.DB;
  const rewardId = newId();
  await db
    .prepare("INSERT INTO rewards (id, family_id, title, star_cost) VALUES (?, ?, ?, ?)")
    .bind(rewardId, familyId, title, starCost)
    .run();

  return json({ ok: true, reward: { id: rewardId, title, starCost } });
}

/**
 * POST /api/rewards/:id/redeem — spend a member's stars on a reward.
 * Body: { memberId }
 */
export async function redeemReward(rewardId, request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const memberId = body.memberId;
  if (!memberId) return errorResponse("memberId is required.");

  const db = env.DB;
  const member = await db
    .prepare("SELECT id FROM members WHERE id = ? AND family_id = ?")
    .bind(memberId, familyId)
    .first();
  if (!member) return errorResponse("Family member not found.", 404);

  const reward = await db
    .prepare("SELECT id, title, star_cost FROM rewards WHERE id = ? AND family_id = ?")
    .bind(rewardId, familyId)
    .first();
  if (!reward) return errorResponse("Reward not found.", 404);

  const totals = await db
    .prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM star_ledger WHERE member_id = ?")
    .bind(memberId)
    .first();
  if (totals.balance < reward.star_cost) {
    return errorResponse("Not enough stars for that reward yet.", 400);
  }

  const ledgerId = newId();
  const idempotencyKey = `reward-redeem:${newId()}`; // each redemption is its own real action
  await db
    .prepare(
      "INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(ledgerId, familyId, memberId, -reward.star_cost, `Redeemed: ${reward.title}`, idempotencyKey)
    .run();

  const redemptionId = newId();
  await db
    .prepare(
      "INSERT INTO reward_redemptions (id, family_id, member_id, reward_id, star_ledger_id) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(redemptionId, familyId, memberId, rewardId, ledgerId)
    .run();

  const newTotals = await db
    .prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM star_ledger WHERE member_id = ?")
    .bind(memberId)
    .first();

  return json({ ok: true, redemptionId, newBalance: newTotals.balance });
}
