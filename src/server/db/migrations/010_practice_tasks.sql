-- 010_practice_tasks.sql: Student targeted practice task assignments and repetition counts
CREATE TABLE IF NOT EXISTS practice_tasks (
  task_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  context TEXT NOT NULL CHECK(context IN ('LEARNING_PRACTICE','REAL_WORLD_INTERACTION')),
  intent_id TEXT NOT NULL,
  instruction TEXT,
  source_teacher_note_id TEXT,
  priority TEXT CHECK(priority IN ('HIGH','MEDIUM','LOW')),
  status TEXT NOT NULL CHECK(status IN ('ASSIGNED','IN_PROGRESS','COMPLETED','ABANDONED')),
  target_repetitions INTEGER DEFAULT 5,
  completed_repetitions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  due_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_practice_tasks_profile_id ON practice_tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_practice_tasks_status ON practice_tasks(status);
