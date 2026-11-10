import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { ensureRewardColumns } from "../lib/schemaUpgrades.js";
import { POINTS, KUDOS_PER_DAY, WEEKLY_GOAL_DEFAULT } from "../lib/points.js";

const MAX_TITLE_LENGTH = 80;

// Rewards work like this:
//  - Anyone can add a reward, for themselves, someone else, or anyone.
//  - A parent's reward is ready straight away. A child's reward is "pending"
//    until a parent OKs it (and can change the price) — parent override.
//  - Only parents can edit or approve; a child can remove their own pending one.
// "Who" is whoever this phone says is using it — there's no separate parent
// password, so this is a family honesty system, not a lock.

async function memberById(db, familyId, id) {
  if (!id) return null;
  return db.prepare("SELECT id, role, display_name FROM members WHERE id = ? AND family_id = ?").bind(id, familyId).first();
}

/** GET /api/rewards — the reward shop + the points rules. */
export async function listRewards(familyId, env) {
  const db = env.DB;
  const extra = await ensureRewardColumns(db);
  const rewards = await db
    .prepare(`SELECT id, title, star_cost, created_at${extra ? ", member_id, status, created_by" : ""} FROM rewards WHERE family_id = ? ORDER BY star_cost ASC`)
    .bind(familyId)
    .all();
  return json({
    ok: true,
    rewards: (rewards.results || []).map((r) => ({ ...r, status: r.status || "approved" })),
    rules: { ...POINTS, kudosPerDay: KUDOS_PER_DAY, weeklyGoalDefault: WEEKLY_GOAL_DEFAULT },
  });
}

/** POST /api/rewards — { title, starCost, memberId?, createdBy? } */
export async function createReward(request, familyId, env) {
  const body = await readJson(request);
  if (!body) return errorResponse("Invalid request body.");

  const title = (body.title || "").trim();
  // Rewards are weekly prizes now (unlocked by the weekly goal), so a price
  // is optional — kept only because the table needs one.
  const starCost = body.starCost === undefined || body.starCost === null || body.starCost === "" ? WEEKLY_GOAL_DEFAULT : Number(body.starCost);
  if (!title || title.length > MAX_TITLE_LENGTH) return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
  if (!Number.isInteger(starCost) || starCost <= 0) return errorResponse("Star cost must be a whole number greater than 0.");

  const db = env.DB;
  const extra = await ensureRewardColumns(db);
  const forMember = body.memberId ? await memberById(db, familyId, body.memberId) : null;
  if (body.memberId && !forMember) return errorResponse("Family member not found.", 404);
  const creator = await memberById(db, familyId, body.createdBy);
  const status = creator && creator.role === "child" ? "pending" : "approved";

  const rewardId = newId();
  if (extra) {
    await db
      .prepare("INSERT INTO rewards (id, family_id, title, star_cost, member_id, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(rewardId, familyId, title, starCost, forMember ? forMember.id : null, status, creator ? creator.id : null)
      .run();
  } else {
    await db.prepare("INSERT INTO rewards (id, family_id, title, star_cost) VALUES (?, ?, ?, ?)").bind(rewardId, familyId, title, starCost).run();
  }
  return json({ ok: true, reward: { id: rewardId, title, starCost, memberId: forMember ? forMember.id : null, status: extra ? status : "approved" } });
}

/** POST /api/rewards/:id/update — parents only: { actorId, title?, starCost?, memberId?, status? } */
export async function updateReward(rewardId, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureRewardColumns(db))) return errorResponse("Can't change rewards right now.", 500);
  const actor = await memberById(db, familyId, body.actorId);
  if (!actor || actor.role !== "parent") return errorResponse("Only a parent can change or approve rewards.", 403);
  const reward = await db.prepare("SELECT id FROM rewards WHERE id = ? AND family_id = ?").bind(rewardId, familyId).first();
  if (!reward) return errorResponse("Reward not found.", 404);

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title || title.length > MAX_TITLE_LENGTH) return errorResponse(`Please enter a title (1-${MAX_TITLE_LENGTH} characters).`);
    await db.prepare("UPDATE rewards SET title = ? WHERE id = ?").bind(title, rewardId).run();
  }
  if (body.starCost !== undefined) {
    const starCost = Number(body.starCost);
    if (!Number.isInteger(starCost) || starCost <= 0) return errorResponse("Star cost must be a whole number greater than 0.");
    await db.prepare("UPDATE rewards SET star_cost = ? WHERE id = ?").bind(starCost, rewardId).run();
  }
  if (body.memberId !== undefined) {
    const m = body.memberId ? await memberById(db, familyId, body.memberId) : null;
    if (body.memberId && !m) return errorResponse("Family member not found.", 404);
    await db.prepare("UPDATE rewards SET member_id = ? WHERE id = ?").bind(m ? m.id : null, rewardId).run();
  }
  if (body.status !== undefined) {
    if (!["approved", "pending"].includes(body.status)) return errorResponse("Unknown status.");
    await db.prepare("UPDATE rewards SET status = ? WHERE id = ?").bind(body.status, rewardId).run();
  }
  return json({ ok: true });
}

/** DELETE /api/rewards/:id?actorId= — a parent, or the child who added a still-pending one. */
export async function deleteReward(rewardId, request, familyId, env) {
  const url = new URL(request.url);
  const db = env.DB;
  const extra = await ensureRewardColumns(db);
  const reward = await db
    .prepare(`SELECT id${extra ? ", status, created_by" : ""} FROM rewards WHERE id = ? AND family_id = ?`)
    .bind(rewardId, familyId)
    .first();
  if (!reward) return errorResponse("Reward not found.", 404);
  const actor = await memberById(db, familyId, url.searchParams.get("actorId"));
  const isParent = actor && actor.role === "parent";
  const ownPending = actor && extra && reward.status === "pending" && reward.created_by === actor.id;
  if (!isParent && !ownPending) return errorResponse("Only a parent can remove this reward.", 403);
  await db.prepare("DELETE FROM reward_redemptions WHERE reward_id = ?").bind(rewardId).run();
  await db.prepare("DELETE FROM rewards WHERE id = ?").bind(rewardId).run();
  return json({ ok: true });
}

/**
 * POST /api/rewards/:id/redeem — switched off. Rewards are now unlocked by
 * reaching the weekly goal (see routes/weekly.js), not bought with stars,
 * so there's no way to spend or game stars in the shop.
 */
export async function redeemReward() {
  return errorResponse("Rewards now unlock each Saturday when you reach your weekly star goal — pick yours in Win the Day!", 400);
}
