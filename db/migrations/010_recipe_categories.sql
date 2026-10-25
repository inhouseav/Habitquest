-- Recipe categories (breakfast/lunch/dinner/snacks/lunchboxes) so the Recipes
-- card can get category tabs, and so AI-assisted recipe intake has somewhere
-- to put the category it picks.

ALTER TABLE recipes ADD COLUMN category TEXT;
