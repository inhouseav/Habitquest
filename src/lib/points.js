// The star rules, all in one place. Kept deliberately small so stars stay
// meaningful and a reward has to be earned over the week:
//   each habit ticked          1 ⭐  (3 a day)
//   a family activity habit    2 ⭐  (planned for Everyone; counts once a day)
//   kudos from a parent        1 ⭐  (max 2 per child per day)
// Winning the day / streaks are celebrated but give no extra stars, and
// bonus habits are just for fun.
//
// Weekly goal: reach WEEKLY_GOAL_DEFAULT ⭐ (Mon–Sun) and your chosen reward
// unlocks on Saturday morning (or as soon as you reach it on the weekend).
// 12 ⭐ ≈ 4 good days — missing a day or two is fine.

export const POINTS = { habit: 1, familyActivity: 2, kudos: 1 };
export const KUDOS_PER_DAY = 2;
export const WEEKLY_GOAL_DEFAULT = 12;
export const REWARD_DAY = 6; // Saturday (0 = Sunday)

export function mondayOf(day) {
  const d = new Date(day + "T00:00:00Z");
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

export function addDays(day, n) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Saturday of the Mon–Sun week containing `day`. */
export function rewardDayOf(day) {
  return addDays(mondayOf(day), REWARD_DAY - 1);
}

/**
 * Habits can only be ticked for "today". Families are in different time
 * zones, so the server accepts its own UTC date ± 1 day — never last week.
 */
export function isTickableDay(day) {
  const today = new Date().toISOString().slice(0, 10);
  return day >= addDays(today, -1) && day <= addDays(today, 1);
}

/** Adds a ledger row once (idempotency key); returns true if it was new. */
export async function awardOnce(db, { familyId, memberId, delta, reason, key, newId }) {
  const existing = await db.prepare("SELECT id FROM star_ledger WHERE idempotency_key = ?").bind(key).first();
  if (existing) return false;
  try {
    await db
      .prepare("INSERT INTO star_ledger (id, family_id, member_id, delta, reason, idempotency_key) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(newId(), familyId, memberId, delta, reason, key)
      .run();
    return true;
  } catch (err) {
    if (String(err.message || err).includes("UNIQUE")) return false;
    throw err;
  }
}

/**
 * Stars earned in the Mon–Sun week containing `day`. Every earning row's
 * key ends with the day it was earned for (habit:<id>:<day>,
 * family:<member>:<day>, kudos:<n>:<member>:<day>), so this counts by that.
 */
export async function starsThisWeek(db, memberId, day) {
  const monday = mondayOf(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const row = await db
    .prepare(`SELECT COALESCE(SUM(delta), 0) AS n FROM star_ledger WHERE member_id = ? AND delta > 0 AND substr(idempotency_key, -10) IN (${days.map(() => "?").join(",")})`)
    .bind(memberId, ...days)
    .first();
  return row ? row.n : 0;
}

/** Which days (YYYY-MM-DD) this member won (all 3 done) in the week containing `day`. */
export async function wonDaysThisWeek(db, memberId, day) {
  const monday = mondayOf(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const total = await db.prepare("SELECT COUNT(*) AS n FROM weekly_habits WHERE member_id = ?").bind(memberId).first();
  const n = total ? total.n : 0;
  if (!n) return [];
  const rows = await db
    .prepare(`SELECT day, COUNT(*) AS c FROM habit_completions WHERE member_id = ? AND day IN (${days.map(() => "?").join(",")}) GROUP BY day`)
    .bind(memberId, ...days)
    .all();
  return (rows.results || []).filter((r) => r.c >= n).map((r) => r.day).sort();
}

export async function daysWonThisWeek(db, memberId, day) {
  return (await wonDaysThisWeek(db, memberId, day)).length;
}
