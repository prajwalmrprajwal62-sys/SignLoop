-- 013_retrieval_runs.sql: Local RAG retrieval execution audit and allowlist filtering log
CREATE TABLE IF NOT EXISTS retrieval_runs (
  retrieval_id TEXT PRIMARY KEY,
  query_type TEXT NOT NULL CHECK(query_type IN ('WHY_TASK','WHAT_NEXT','PROGRESS','SHOW_REFERENCE','ASK_TEACHER','COMMUNICATION_PHRASE','UNSUPPORTED')),
  query_text TEXT,
  profile_id TEXT REFERENCES profiles(id),
  context TEXT,
  actor_role TEXT,
  source_allowlist_json TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  candidate_source_ids_json TEXT NOT NULL,
  selected_source_ids_json TEXT NOT NULL,
  excluded_source_ids_json TEXT NOT NULL,
  index_version TEXT NOT NULL DEFAULT 'local-fts-v1',
  policy_version TEXT NOT NULL DEFAULT 'rag-policy-v1',
  status TEXT NOT NULL CHECK(status IN ('SUCCESS','INSUFFICIENT','CONFLICT','REVOKED_MATCH','UNAUTHORIZED')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retrieval_runs_profile_id ON retrieval_runs(profile_id);
