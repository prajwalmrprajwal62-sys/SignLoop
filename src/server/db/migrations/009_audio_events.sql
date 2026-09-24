-- 009_audio_events.sql: Audio playback lifecycle and device state tracking
CREATE TABLE IF NOT EXISTS audio_events (
  audio_event_id TEXT PRIMARY KEY,
  output_id TEXT NOT NULL REFERENCES approved_outputs(output_id),
  event_type TEXT NOT NULL CHECK(event_type IN (
    'AUDIO_REQUESTED','AUDIO_STARTED','AUDIO_COMPLETED','AUDIO_FAILED','PLAYBACK_UNKNOWN'
  )),
  provider_or_device TEXT,
  failure_reason TEXT,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audio_events_output_id ON audio_events(output_id);
