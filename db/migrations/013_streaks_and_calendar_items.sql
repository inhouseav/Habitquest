-- Daily streaks: one row per person, recomputed each time a day's 3 habits
-- are all ticked off ("the day is won"). Keeps current + longest streak so
-- the UI doesn't need to replay full history every page load.
CREATE TABLE IF NOT EXISTS habit_streaks (
  member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_won_day TEXT -- YYYY-MM-DD, the last day this streak advanced
);

-- Tracks ticking off a Google Calendar item as a bonus checklist item for a
-- specific person on a specific day. The calendar connection is family-wide
-- (not per-person), so this is what makes an otherwise-shared Google event
-- into "did Bevan do this today" per member. These do NOT currently count
-- toward winning the day / the streak — only the 3 typed weekly habits do
-- (Google items are family-wide, not obviously any one person's to "win").
CREATE TABLE IF NOT EXISTS calendar_item_completions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  day TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, google_event_id, day)
);
CREATE INDEX IF NOT EXISTS idx_cal_item_completions_member_day ON calendar_item_completions(member_id, day);
