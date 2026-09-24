-- 002_profile_contexts.sql: Role execution contexts & modal preferences
CREATE TABLE IF NOT EXISTS profile_contexts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK(context_type IN ('LEARNING_PRACTICE','REAL_WORLD_INTERACTION')),
  consent_status TEXT NOT NULL CHECK(consent_status IN ('GRANTED','REVOKED','PENDING')),
  output_modality TEXT DEFAULT 'TEXT_AND_AUDIO',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_contexts_profile_id ON profile_contexts(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_contexts_unique ON profile_contexts(profile_id, context_type);
