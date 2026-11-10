import { json, errorResponse, readJson } from "../lib/http.js";
import { newId } from "../lib/crypto.js";
import { ensureWeeklyGoals, ensureRewardColumns } from "../lib/schemaUpgrades.js";
import { resolveParentActor } from "../lib/parent.js";
import { WEEKLY_GOAL_DEFAULT, REWARD_DAY, mondayOf, rewardDayOf, starsThisWeek, isTickableDay } from "../lib/points.js";

// The weekly reward loop, so parents don't have to think about it:
//  1. Each person picks one reward for the week (from the approved list).
//  2. Stars from habits/family activities/kudos add up Mon–Sun.
//  3. From Saturday morning, if they've reached the weekly goal, the reward
//     unlocks by itself and shows in the parents' "to give" list.
//  4. A parent taps "Given" once they've had it.
// Nobody spends stars, so there's nothing to game in the shop.

function validDay(day) { return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day); }

async function familyGoal(db, familyId) {
  const row = await db.prepare("SELECT weekly_goal FROM families WHERE id = ?").bind(familyId).first();
  return row && row.weekly_goal ? row.weekly_goal : WEEKLY_GOAL_DEFAULT;
}

/** GET /api/weekly?day=YYYY-MM-DD (the phone's today) — everyone's week + parents' to-give list. */
export async function getWeekly(request, familyId, env) {
  const url = new URL(request.url);
  const day = validDay(url.searchParams.get("day")) ? url.searchParams.get("day") : new Date().toISOString().slice(0, 10);
  const db = env.DB;
  const [weeklyReady] = await Promise.all([ensureWeeklyGoals(db), ensureRewardColumns(db)]);
  if (!weeklyReady) return errorResponse("Weekly rewards aren't available right now.", 500);
  const weekOf = mondayOf(day);
  const unlockDay = rewardDayOf(day);
  // Only unlock if the phone's "today" really is today (± time zones) —
  // so nobody can unlock early by asking about Saturday on a Wednesday.
  const unlockOpen = day >= unlockDay && isTickableDay(day);

  // All independent, so asked at once (fewer slow round trips).
  const [goal, membersRes] = await Promise.all([
    familyGoal(db, familyId),
    db.prepare("SELECT id, display_name, role FROM members WHERE family_id = ? ORDER BY created_at ASC").bind(familyId).all(),
  ]);
  const members = membersRes.results || [];
  const out = await Promise.all(members.map(async (m) => {
    const [stars, found] = await Promise.all([
      starsThisWeek(db, m.id, day),
      db.prepare("SELECT g.id, g.reward_id, g.status, r.title AS reward_title FROM weekly_goals g LEFT JOIN rewards r ON r.id = g.reward_id WHERE g.member_id = ? AND g.week_of = ?")
        .bind(m.id, weekOf).first(),
    ]);
    let row = found;
    // Unlock automatically once it's reward day and the goal is reached.
    if (row && row.status === "working" && row.reward_id && unlockOpen && stars >= goal) {
      await db.prepare("UPDATE weekly_goals SET status = 'earned', earned_at = datetime('now') WHERE id = ?").bind(row.id).run();
      row = { ...row, status: "earned" };
    }
    return {
      memberId: m.id,
      name: m.display_name,
      role: m.role,
      starsThisWeek: stars,
      goalId: row ? row.id : null,
      rewardId: row ? row.reward_id : null,
      rewardTitle: row ? row.reward_title : null,
      status: row ? row.status : "none",
    };
  }));

  const toGive = ((await db
    .prepare(`SELECT g.id, g.week_of, g.member_id, m.display_name AS name, r.title AS reward_title
      FROM weekly_goals g JOIN members m ON m.id = g.member_id LEFT JOIN rewards r ON r.id = g.reward_id
      WHERE g.family_id = ? AND g.status = 'earned' ORDER BY g.week_of DESC`)
    .bind(familyId)
    .all()).results) || [];

  return json({ ok: true, goal, weekOf, unlockDay, unlockOpen, rewardDayIndex: REWARD_DAY, members: out, toGive });
}

/** POST /api/weekly/choose — { memberId, rewardId, day } pick (or change) this week's reward. */
export async function chooseWeeklyReward(request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureWeeklyGoals(db))) return errorResponse("Weekly rewards aren't available right now.", 500);
  await ensureRewardColumns(db);
  const day = validDay(body.day) ? body.day : new Date().toISOString().slice(0, 10);
  if (!isTickableDay(day)) return errorResponse("You can only choose this week's reward.", 400);
  const member = await db.prepare("SELECT id FROM members WHERE id = ? AND family_id = ?").bind(body.memberId || "", familyId).first();
  if (!member) return errorResponse("Family member not found.", 404);
  const reward = await db.prepare("SELECT id, member_id, status FROM rewards WHERE id = ? AND family_id = ?").bind(body.rewardId || "", familyId).first();
  if (!reward) return errorResponse("Reward not found.", 404);
  if (reward.status === "pending") return errorResponse("That reward is waiting for a parent to OK it.", 400);
  if (reward.member_id && reward.member_id !== member.id) return errorResponse("That reward is for someone else.", 400);

  const weekOf = mondayOf(day);
  const existing = await db.prepare("SELECT id, status FROM weekly_goals WHERE member_id = ? AND week_of = ?").bind(member.id, weekOf).first();
  if (existing && existing.status !== "working") return errorResponse("This week's reward is already earned — pick again next week!", 400);
  if (existing) {
    await db.prepare("UPDATE weekly_goals SET reward_id = ? WHERE id = ?").bind(reward.id, existing.id).run();
  } else {
    await db.prepare("INSERT INTO weekly_goals (id, family_id, member_id, week_of, reward_id) VALUES (?, ?, ?, ?, ?)").bind(newId(), familyId, member.id, weekOf, reward.id).run();
  }
  return json({ ok: true });
}

/** POST /api/weekly/:id/given — { actorId } a parent marks an earned reward as given. */
export async function markGiven(goalId, request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureWeeklyGoals(db))) return errorResponse("Weekly rewards aren't available right now.", 500);
  const actor = await resolveParentActor(db, request, familyId, body.actorId || "");
  if (!actor) return errorResponse("Only a parent can mark a reward as given (unlock with the parent PIN).", 403);
  const goal = await db.prepare("SELECT id, status FROM weekly_goals WHERE id = ? AND family_id = ?").bind(goalId, familyId).first();
  if (!goal) return errorResponse("Not found.", 404);
  if (goal.status !== "earned") return errorResponse("That reward hasn't been earned yet.", 400);
  await db.prepare("UPDATE weekly_goals SET status = 'given', given_at = datetime('now') WHERE id = ?").bind(goalId).run();
  return json({ ok: true });
}

/** POST /api/weekly/settings — { actorId, goal } a parent changes the weekly star goal. */
export async function saveWeeklySettings(request, familyId, env) {
  const body = (await readJson(request)) || {};
  const db = env.DB;
  if (!(await ensureWeeklyGoals(db))) return errorResponse("Weekly rewards aren't available right now.", 500);
  const actor = await resolveParentActor(db, request, familyId, body.actorId || "");
  if (!actor) return errorResponse("Only a parent can change the weekly goal (unlock with the parent PIN).", 403);
  const goal = Number(body.goal);
  if (!Number.isInteger(goal) || goal < 3 || goal > 40) return errorResponse("Pick a weekly goal between 3 and 40 stars.");
  await db.prepare("UPDATE families SET weekly_goal = ? WHERE id = ?").bind(goal, familyId).run();
  return json({ ok: true, goal });
}
