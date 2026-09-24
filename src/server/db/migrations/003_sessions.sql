-- 003_sessions.sql: Interactive session lifecycle, modality, and provenance
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  context TEXT NOT NULL CHECK(context IN ('LEARNING_PRACTICE','REAL_WORLD_INTERACTION')),
  role TEXT NOT NULL,
  source_modality TEXT NOT NULL CHECK(source_modality IN ('GLOVE','CAMERA','SPECS','SIMULATED','REPLAY')),
  provenance TEXT NOT NULL CHECK(provenance IN ('LIVE','SIMULATED','REPLAY','CACHED')),
  consent_scope TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE','COMPLETED','TERMINATED','ABORTED')),
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
