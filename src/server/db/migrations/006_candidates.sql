-- 006_candidates.sql: Classifier gesture candidates, model scores, and route gating
CREATE TABLE IF NOT EXISTS candidates (
  candidate_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  observation_id TEXT,
  intent_label TEXT NOT NULL,
  score REAL, -- NULL when unmeasured; NEVER convert to 0
  score_type TEXT DEFAULT 'model_score',
  routing_gate REAL DEFAULT 0.75,
  policy_route TEXT NOT NULL CHECK(policy_route IN ('CANDIDATE_READY','REVIEW_REQUIRED','SIGNAL_INVALID','NO_SIGN')),
  model_version TEXT,
  smoothing_window TEXT,
  why_reason_code TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidates_session_id ON candidates(session_id);
CREATE INDEX IF NOT EXISTS idx_candidates_policy_route ON candidates(policy_route);
