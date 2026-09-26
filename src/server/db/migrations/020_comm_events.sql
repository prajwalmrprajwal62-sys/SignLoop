-- 020_comm_events.sql: Audit trail for staff/communicator phrase output
-- The Communication page bypasses the student glove pipeline entirely —
-- staff directly selects and speaks phrases. This table records those outputs
-- so every phrase that was spoken/confirmed is part of the auditable system.
CREATE TABLE IF NOT EXISTS comm_events (
  event_id      TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL,              -- which staff member spoke
  intent_id     TEXT NOT NULL,              -- e.g. 'HELP', 'WATER'
  caption_text  TEXT NOT NULL,              -- the phrase that was spoken
  action        TEXT NOT NULL CHECK(action IN ('CONFIRMED', 'REPEATED', 'CANCELLED')),
  tts_provider  TEXT NOT NULL DEFAULT 'WEB_SPEECH_API',
  occurred_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comm_events_profile_id ON comm_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_comm_events_occurred_at ON comm_events(occurred_at);
