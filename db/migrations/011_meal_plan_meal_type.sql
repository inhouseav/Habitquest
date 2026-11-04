-- Lets each planned meal be tagged breakfast/lunch/dinner/snacks, so This
-- Week's Meals can show each day sorted into sections instead of one flat
-- list. NULL for any meal planned before this migration (shown under an
-- "Other" section until re-tagged).

ALTER TABLE meal_plan_items ADD COLUMN meal_type TEXT;
