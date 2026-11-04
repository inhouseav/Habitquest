-- Remembered movement ideas for the Planner's drag-and-drop palette. Starts
-- with whatever a family adds themselves (via "+ Add" in the Planner) and
-- just keeps growing — nothing hardcoded in the app, so it actually
-- reflects what this family does, not a generic list.
CREATE TABLE IF NOT EXISTS movement_ideas (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(family_id, title)
);
