-- 012_knowledge_sources.sql: Allowlisted teacher knowledge, student evidence & curriculum
CREATE TABLE IF NOT EXISTS knowledge_sources (
  source_id TEXT PRIMARY KEY,
  source_class TEXT NOT NULL CHECK(source_class IN ('TEACHER_KNOWLEDGE','STUDENT_EVIDENCE','APPROVED_TRAINING')),
  profile_id TEXT REFERENCES profiles(id),
  context TEXT CHECK(context IN ('LEARNING_PRACTICE','REAL_WORLD_INTERACTION',NULL)),
  intent_id TEXT,
  task_id TEXT REFERENCES practice_tasks(task_id),
  author_id TEXT,
  author_role TEXT,
  source_title TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('INSTRUCTION','CORRECTION','OBSERVATION','GOAL','ASSIGNMENT','GESTURE_SPEC','EVIDENCE_SUMMARY')),
  locale TEXT DEFAULT 'en-IN',
  status TEXT NOT NULL CHECK(status IN ('DRAFT','APPROVED','ACTIVE','SUPERSEDED','REVOKED')),
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_id TEXT REFERENCES knowledge_sources(source_id),
  session_id TEXT REFERENCES sessions(id),
  event_id TEXT REFERENCES events(event_id),
  consent_scope TEXT NOT NULL,
  retention_class TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_class_status ON knowledge_sources(source_class, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_profile_id ON knowledge_sources(profile_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_intent_id ON knowledge_sources(intent_id);
