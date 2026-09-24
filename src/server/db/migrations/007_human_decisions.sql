-- 007_human_decisions.sql: Human verification, correction, or rejection of candidates
CREATE TABLE IF NOT EXISTS human_decisions (
  decision_id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(candidate_id),
  action TEXT NOT NULL CHECK(action IN ('CONFIRM','CORRECT','REJECT','REQUEST_REPEAT','MARK_INSUFFICIENT')),
  final_intent TEXT,
  actor_profile_id TEXT REFERENCES profiles(id),
  actor_role TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_human_decisions_candidate_id ON human_decisions(candidate_id);
