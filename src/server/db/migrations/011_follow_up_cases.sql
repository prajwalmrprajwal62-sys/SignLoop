-- 011_follow_up_cases.sql: Longitudinal review cases following corrections or confusion
CREATE TABLE IF NOT EXISTS follow_up_cases (
  case_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  context TEXT NOT NULL CHECK(context IN ('LEARNING_PRACTICE','REAL_WORLD_INTERACTION')),
  intent_id TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  correction_event_id TEXT REFERENCES events(event_id),
  correction_reason TEXT,
  created_at TEXT NOT NULL,
  due_at TEXT,
  target_repetitions INTEGER DEFAULT 10,
  minimum_eligible_attempts INTEGER DEFAULT 5,
  status TEXT NOT NULL CHECK(status IN ('OPEN','IN_REVIEW','IMPROVED','STABLE','WORSE','UNCLEAR','CLOSED')),
  trainer_owner TEXT,
  policy_snapshot_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_follow_up_cases_profile_id ON follow_up_cases(profile_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_cases_status ON follow_up_cases(status);
