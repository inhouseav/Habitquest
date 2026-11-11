-- Record only: the app adds this itself (src/routes/events.js ensureCountdown).
ALTER TABLE events ADD COLUMN countdown INTEGER NOT NULL DEFAULT 0;
