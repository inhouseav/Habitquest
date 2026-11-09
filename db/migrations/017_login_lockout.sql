-- Stops someone guessing a family's PIN: after 5 wrong PINs in a row the
-- family's login is paused for 10 minutes. Login still works if this
-- migration hasn't been run yet (the lockout just doesn't kick in).
ALTER TABLE families ADD COLUMN failed_pin_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE families ADD COLUMN pin_locked_until TEXT;
