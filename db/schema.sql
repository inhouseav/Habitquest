-- Fuel the Fun — D1 schema (Session 1 draft)
-- Cloudflare D1 (SQLite). Stars are an auditable ledger, not a mutable counter,
-- so history is preserved even if award values change later.

PRAGMA foreign_keys = ON;

-- A family is the top-level account. Login is a shared family PIN, not per-person OAuth.
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,              -- uuid
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,           -- hashed, never stored in plain text
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A member is a person within a family (child or parent).
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,              -- uuid
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('child', 'parent')),
  color TEXT,                       -- per-person calendar color
  interests TEXT,                   -- JSON array, used to personalize challenges
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Shared family calendar events.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  pillar TEXT CHECK (pillar IN ('fuel', 'move', 'grow', NULL)),  -- "Daily Three" tag, optional
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  recurrence TEXT,                  -- JSON, e.g. days-of-week picker
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Star ledger: append-only. Never UPDATE a row's value after the fact —
-- corrections are new rows (positive or negative), so history stays truthful.
CREATE TABLE IF NOT EXISTS star_ledger (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,                -- positive = earned, negative = spent/correction
  reason TEXT NOT NULL,                  -- e.g. "fuel pillar complete", "reward redeemed"
  source_event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL UNIQUE,  -- prevents duplicate awards for the same action
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Recipes module.
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id) ON DELETE CASCADE,  -- NULL = shared/global recipe
  title TEXT NOT NULL,
  ingredients TEXT NOT NULL,   -- JSON array
  steps TEXT NOT NULL,         -- JSON array
  tags TEXT,                   -- JSON array, e.g. ["snack", "grow-it"]
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_events_family ON events(family_id);
CREATE INDEX IF NOT EXISTS idx_star_ledger_member ON star_ledger(member_id);
