-- Lets a family drag/tap their 3 chosen habits onto specific days of the
-- week (e.g. "Move" on Tue/Thu only), shown as a simple Mon-Sun list under
-- This Week's Habits, matching how the Meal Plan's week list already works.
-- Purely a planning aid — ticking a habit off "today" (habit_completions,
-- unchanged) still works the same regardless of whether it's planned here.
CREATE TABLE IF NOT EXISTS habit_day_plan (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, slot, day)
);

CREATE INDEX IF NOT EXISTS idx_habit_day_plan_family_day ON habit_day_plan(family_id, day);
