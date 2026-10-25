-- Family Memories: a photo can now be tagged to a habit/activity (not just
-- a recipe), so cooking AND move/grow moments can both appear in the
-- Memories slideshow. "together" tracking stays on meal_plan_items only
-- (migration 008) for now — this does not add a together flag to photos.

ALTER TABLE cookbook_photos ADD COLUMN habit_id TEXT REFERENCES weekly_habits(id) ON DELETE SET NULL;
