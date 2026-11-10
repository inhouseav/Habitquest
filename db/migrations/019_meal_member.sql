-- Record only: the app adds this itself on first use (src/lib/schemaUpgrades.js).
-- Who a planned meal is for: NULL = the whole family, or one member's id.
ALTER TABLE meal_plan_items ADD COLUMN member_id TEXT;
