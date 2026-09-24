-- 004_events.sql: Immutable append-only event ledger and protective triggers
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  session_id TEXT REFERENCES sessions(id),
  profile_id TEXT REFERENCES profiles(id),
  context TEXT,
  actor TEXT NOT NULL,
  actor_role TEXT,
  modality TEXT,
  consent_scope TEXT,
  provenance TEXT NOT NULL CHECK(provenance IN ('LIVE','SIMULATED','REPLAY','CACHED')),
  retention_class TEXT NOT NULL CHECK(retention_class IN ('SESSION_ONLY','RAW_TELEMETRY','DERIVED_EVENT','DERIVED_SUMMARY','PERMANENT_AUDIT')),
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_profile_id ON events(profile_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at);

-- Trigger 1: Enforce append-only immutability against UPDATE
CREATE TRIGGER IF NOT EXISTS prevent_events_update BEFORE UPDATE ON events
BEGIN
  SELECT RAISE(ABORT, 'Violation: events table is append-only. UPDATE operations are forbidden.');
END;

-- Trigger 2: Enforce append-only immutability against DELETE
CREATE TRIGGER IF NOT EXISTS prevent_events_delete BEFORE DELETE ON events
BEGIN
  SELECT RAISE(ABORT, 'Violation: events table is append-only. DELETE operations are forbidden.');
END;
