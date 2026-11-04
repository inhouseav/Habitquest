-- Extends movement_ideas to also hold "Home" ideas (chores like tidy room,
-- set the table) alongside the original Movement ones, and tracks how often
-- each idea actually gets scheduled onto the calendar so popular ones
-- (e.g. "Netball", used every week) can float to the top of the palette.
ALTER TABLE movement_ideas ADD COLUMN category TEXT NOT NULL DEFAULT 'movement';
ALTER TABLE movement_ideas ADD COLUMN use_count INTEGER NOT NULL DEFAULT 0;
