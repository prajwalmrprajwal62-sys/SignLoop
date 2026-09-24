-- 015_consent_and_retention.sql: User privacy scopes, retention expiry, and revocation audit
CREATE TABLE IF NOT EXISTS consent_and_retention (
  record_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  scope TEXT NOT NULL CHECK(scope IN ('SESSION_ONLY','TRAINING_GROUNDING','AGGREGATE_AUDIT')),
  status TEXT NOT NULL CHECK(status IN ('ACTIVE','REVOKED','EXPIRED')),
  raw_media_policy TEXT NOT NULL DEFAULT 'NOT_STORED',
  derived_event_policy TEXT NOT NULL DEFAULT 'STORED_UNTIL_REVOKED',
  retention_until TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_and_retention_profile_id ON consent_and_retention(profile_id);
