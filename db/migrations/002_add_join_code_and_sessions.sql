-- Session 2 migration: adds a human-friendly join code families use to log
-- in (instead of a long internal id), and a sessions table for simple
-- token-based login state.

ALTER TABLE families ADD COLUMN join_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_families_join_code ON families(join_code);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_family ON sessions(family_id);
