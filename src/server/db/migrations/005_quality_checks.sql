-- 005_quality_checks.sql: Pre-recognition sensor & frame quality validation
CREATE TABLE IF NOT EXISTS quality_checks (
  gate_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  policy_version TEXT NOT NULL DEFAULT 'quality-policy-v1',
  status TEXT NOT NULL CHECK(status IN ('PASS','FAIL','NOT_EVALUATED')),
  primary_reason_code TEXT,
  checks_json TEXT NOT NULL, -- Array of { id, name, status, observed_value, threshold_or_rule, repair_hint }
  evaluated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_session_id ON quality_checks(session_id);
