-- 014_tutor_responses.sql: Deterministic grounded tutor responses & abstention tracking
CREATE TABLE IF NOT EXISTS tutor_responses (
  response_id TEXT PRIMARY KEY,
  retrieval_id TEXT NOT NULL REFERENCES retrieval_runs(retrieval_id),
  answer_type TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  recommended_action TEXT,
  source_ids_json TEXT NOT NULL,
  evidence_window TEXT,
  retrieval_status TEXT NOT NULL CHECK(retrieval_status IN (
    'GROUNDED','ABSTAINED','INSUFFICIENT_EVIDENCE','NEEDS_TEACHER','SOURCES_CONFLICT'
  )),
  abstention_reason TEXT,
  policy_version TEXT NOT NULL DEFAULT 'rag-policy-v1',
  index_version TEXT NOT NULL DEFAULT 'local-fts-v1',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tutor_responses_retrieval_id ON tutor_responses(retrieval_id);
