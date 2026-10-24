-- Replaces the fixed Fuel/Move/Grow pillars with each person's own 3
-- chosen weekly habits. Old daily_pillars table is left in place
-- (untouched, just no longer used by the UI) so no history is lost.

CREATE TABLE IF NOT EXISTS weekly_habits (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2, 3)),
  title TEXT NOT NULL,
  emoji TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, slot)
);
CREATE INDEX IF NOT EXISTS idx_weekly_habits_member ON weekly_habits(member_id);

CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES weekly_habits(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  day TEXT NOT NULL, -- YYYY-MM-DD
  star_ledger_id TEXT REFERENCES star_ledger(id) ON DELETE SET NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(habit_id, day)
);
CREATE INDEX IF NOT EXISTS idx_habit_completions_member_day ON habit_completions(member_id, day);
