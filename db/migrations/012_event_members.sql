-- Lets a calendar event be tagged to several specific family members (not
-- just one), for things like "Mum and Sarah at the park" that aren't a
-- single person's event but also aren't the whole family. Only used when
-- 2+ specific people (but not literally everyone) are tagged to an event —
-- a single-person event still just uses events.member_id as before, and a
-- NULL events.member_id with no rows here still means "whole family"
-- (unchanged from before this migration).

CREATE TABLE IF NOT EXISTS event_members (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_event_members_member ON event_members(member_id);
