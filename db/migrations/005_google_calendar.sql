-- One Google Calendar connection per family (stores the refresh token so we
-- can keep getting new access tokens without asking them to log in again).
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  family_id TEXT PRIMARY KEY,
  refresh_token TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  connected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Short-lived, single-use rows so the public OAuth callback (which Google
-- redirects to with no login session) can still know which family started
-- the connection. Each row is deleted the moment it's used.
CREATE TABLE IF NOT EXISTS google_oauth_states (
  state TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
