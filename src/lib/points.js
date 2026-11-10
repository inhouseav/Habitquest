// The points rules, all in one place. Tuned so a child who wins most days
// earns about one reward a week:
//   each habit ticked  +1  (3 a day)
//   win the day        +2  (all 3 done)
//   win the week      +10  (won every day Mon–Sun)
//   family activity    +2  (a habit the Planner set for Everyone)
//   bonus habit        +1
// A perfect week = 7 × (3 + 2) + 10 = 45 ⭐. Winning 5 of 7 days ≈ 30 ⭐.
// So a reward priced around 30 ⭐ is "about one a week".

export const POINTS = {
  habit: 1,
  winDay: 2,
  winWeek: 10,
  familyActivity: 2,
  bonusHabit: 1,
};

export const PERFECT_WEEK = 7 * (3 * POINTS.habit + POINTS.winDay) + POINTS.winWeek; // 45
export const SUGGESTED_WEEKLY_REWARD = 30;

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

/** Which days (YYYY-MM-DD) this member won in the Mon–Sun week containing `day`. */
export async function wonDaysThisWeek(db, memberId, day) {
  const monday = mondayOf(day);
  const keys = Array.from({ length: 7 }, (_, i) => `win:${memberId}:${addDays(monday, i)}`);
  const rows = await db
    .prepare(`SELECT idempotency_key AS k FROM star_ledger WHERE idempotency_key IN (${keys.map(() => "?").join(",")})`)
    .bind(...keys)
    .all();
  return (rows.results || []).map((r) => r.k.split(":").pop()).sort();
}

/** How many days this member has won in the Mon–Sun week containing `day`. */
export async function daysWonThisWeek(db, memberId, day) {
  const monday = mondayOf(day);
  const keys = Array.from({ length: 7 }, (_, i) => `win:${memberId}:${addDays(monday, i)}`);
  const rows = await db
    .prepare(`SELECT COUNT(*) AS n FROM star_ledger WHERE idempotency_key IN (${keys.map(() => "?").join(",")})`)
    .bind(...keys)
    .first();
  return rows ? rows.n : 0;
}
