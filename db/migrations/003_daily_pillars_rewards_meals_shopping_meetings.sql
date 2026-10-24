-- Session 3-8 migration: Daily Three completions, reward shop, recipes
-- (already in 001) + meal planning/voting, shopping list, weekly family
-- meetings. recipes table already exists from 001_init (db/schema.sql).

CREATE TABLE IF NOT EXISTS daily_pillars (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL CHECK (pillar IN ('fuel', 'move', 'grow')),
  day TEXT NOT NULL, -- YYYY-MM-DD
  star_ledger_id TEXT REFERENCES star_ledger(id) ON DELETE SET NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, pillar, day)
);
CREATE INDEX IF NOT EXISTS idx_daily_pillars_member_day ON daily_pillars(member_id, day);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  star_cost INTEGER NOT NULL CHECK (star_cost > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rewards_family ON rewards(family_id);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  star_ledger_id TEXT NOT NULL REFERENCES star_ledger(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_redemptions_member ON reward_redemptions(member_id);

CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shopping_family ON shopping_items(family_id);

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  day TEXT NOT NULL, -- YYYY-MM-DD
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  votes TEXT, -- JSON array of member_ids who voted for this option
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_meal_plan_family_day ON meal_plan_items(family_id, day);

CREATE TABLE IF NOT EXISTS family_meetings (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_of TEXT NOT NULL, -- YYYY-MM-DD, Monday of that week
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(family_id, week_of)
);
