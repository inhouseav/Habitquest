-- Record only: the app creates this itself (src/routes/foodPassport.js).
CREATE TABLE IF NOT EXISTS food_passport (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  food_key TEXT NOT NULL,
  food_name TEXT NOT NULL,
  emoji TEXT,
  verdict TEXT NOT NULL DEFAULT 'ok',
  day TEXT NOT NULL,
  starred INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, food_key)
);
