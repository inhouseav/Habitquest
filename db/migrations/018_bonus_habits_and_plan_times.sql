-- Record only: the app creates these itself on first use
-- (src/lib/schemaUpgrades.js), so this does NOT need running by hand.
--
-- Bonus habits: up to 2 extras per person (slots 4-5). They earn a star when
-- ticked but don't count toward "do all 3 to win the day".
CREATE TABLE IF NOT EXISTS bonus_habits (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot IN (4, 5)),
  title TEXT NOT NULL,
  emoji TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, slot)
);
CREATE TABLE IF NOT EXISTS bonus_completions (
  id TEXT PRIMARY KEY,
  bonus_habit_id TEXT NOT NULL REFERENCES bonus_habits(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  star_ledger_id TEXT REFERENCES star_ledger(id) ON DELETE SET NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(bonus_habit_id, day)
);
CREATE INDEX IF NOT EXISTS idx_bonus_completions_member_day ON bonus_completions(member_id, day);

-- Optional reminder time (HH:MM local) on a habit planned onto a day.
ALTER TABLE habit_day_plan ADD COLUMN time TEXT;
-- Optional "just for this day" habit title (set from the Planner).
ALTER TABLE habit_day_plan ADD COLUMN title TEXT;
