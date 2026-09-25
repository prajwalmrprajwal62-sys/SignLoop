-- Fix migration 017: student_questions FK referenced profiles(profile_id)
-- but the profiles table PK is actually `id`. Drop and recreate without the broken FK.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS student_questions;

CREATE TABLE student_questions (
  question_id   TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL,       -- matches profiles.id (the student's id)
  question_text TEXT NOT NULL,
  intent_id     TEXT,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK(status IN ('PENDING', 'ANSWERED', 'DISMISSED')),
  teacher_answer TEXT,
  answered_by   TEXT,
  answered_at   TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_questions_profile ON student_questions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_questions_status  ON student_questions(status, created_at DESC);

PRAGMA foreign_keys = ON;
