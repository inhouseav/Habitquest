-- Family Cookbook: favourite recipes + photos (uploaded or AI-generated),
-- compiled into a weekly/monthly cookbook view. Needs the R2 "PHOTOS"
-- bucket created and bound before the photo routes will work.

ALTER TABLE recipes ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS cookbook_photos (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  source TEXT NOT NULL DEFAULT 'upload', -- 'upload' | 'ai'
  caption TEXT,
  day TEXT NOT NULL, -- YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cookbook_photos_family_day ON cookbook_photos(family_id, day);
