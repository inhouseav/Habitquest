-- Record only: the app creates these itself on first use (src/lib/schemaUpgrades.js).
CREATE TABLE IF NOT EXISTS weekly_goals (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_of TEXT NOT NULL,            -- Monday, YYYY-MM-DD
  reward_id TEXT REFERENCES rewards(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'working', -- working | earned | given
  earned_at TEXT,
  given_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, week_of)
);
ALTER TABLE families ADD COLUMN weekly_goal INTEGER; -- NULL = default (12)
