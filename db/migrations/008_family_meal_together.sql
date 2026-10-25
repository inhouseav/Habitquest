-- Dietitians repeatedly called out "eating together as a family, at least
-- once a week" as one of the habits with the biggest impact. This lets a
-- meal plan item be marked as a together meal, so the app can show a
-- gentle weekly counter (never a guilt/shame mechanic).

ALTER TABLE meal_plan_items ADD COLUMN together INTEGER NOT NULL DEFAULT 0;
