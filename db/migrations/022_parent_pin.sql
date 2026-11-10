-- Record only: the app adds these itself on first use (src/lib/parent.js).
ALTER TABLE families ADD COLUMN parent_pin_hash TEXT;
ALTER TABLE families ADD COLUMN parent_pin_failed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE families ADD COLUMN parent_pin_locked_until TEXT;
ALTER TABLE sessions ADD COLUMN parent_member_id TEXT; -- which parent unlocked this logged-in phone
