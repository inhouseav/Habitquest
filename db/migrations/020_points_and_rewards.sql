-- Record only: the app adds these itself on first use (src/lib/schemaUpgrades.js).
-- A habit the Planner set for Everyone (family activity) earns bonus points.
ALTER TABLE habit_day_plan ADD COLUMN is_family INTEGER NOT NULL DEFAULT 0;
-- Rewards per person + parent approval.
ALTER TABLE rewards ADD COLUMN member_id TEXT;
ALTER TABLE rewards ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE rewards ADD COLUMN created_by TEXT;
