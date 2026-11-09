// Database additions the app makes for itself, so nobody has to remember to
// paste a migration into the D1 console. Each one is checked once per Worker
// instance, only ever ADDS (never drops or changes existing data), and if it
// fails the feature that needs it just stays off — the rest of the app keeps
// working. The same SQL is kept in db/migrations/ as a record.

let bonusReady = false;
let planTimeReady = false;

async function columnNames(db, table) {
  const rows = await db.prepare(`SELECT name FROM pragma_table_info('${table}')`).all();
  return new Set((rows.results || []).map((r) => r.name));
}

/** Bonus habits: up to 2 extra per person (slots 4-5). Earn stars, don't count toward winning the day. */
export async function ensureBonusTables(db) {
  if (bonusReady) return true;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS bonus_habits (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      slot INTEGER NOT NULL CHECK (slot IN (4, 5)),
      title TEXT NOT NULL,
      emoji TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(member_id, slot)
    )`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS bonus_completions (
      id TEXT PRIMARY KEY,
      bonus_habit_id TEXT NOT NULL REFERENCES bonus_habits(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      star_ledger_id TEXT REFERENCES star_ledger(id) ON DELETE SET NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(bonus_habit_id, day)
    )`).run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_bonus_completions_member_day ON bonus_completions(member_id, day)").run();
    bonusReady = true;
  } catch (err) {
    bonusReady = false;
  }
  return bonusReady;
}

/** Optional reminder time (HH:MM, the family's local time) on a habit planned onto a day. */
export async function ensureHabitPlanTime(db) {
  if (planTimeReady) return true;
  try {
    if (!(await columnNames(db, "habit_day_plan")).has("time")) {
      await db.prepare("ALTER TABLE habit_day_plan ADD COLUMN time TEXT").run().catch(() => {});
    }
    planTimeReady = (await columnNames(db, "habit_day_plan")).has("time");
  } catch (err) {
    planTimeReady = false;
  }
  return planTimeReady;
}
