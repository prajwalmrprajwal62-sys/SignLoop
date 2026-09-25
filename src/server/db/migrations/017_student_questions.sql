-- Student Questions: direct async Q&A between student and teacher.
-- Separate from the AI/RAG tutor. Student asks a real question,
-- teacher sees it in ADD NOTE > Student Questions and answers it.

CREATE TABLE IF NOT EXISTS student_questions (
  question_id   TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL,       -- student who asked
  question_text TEXT NOT NULL,       -- the student's question
  intent_id     TEXT,                -- optional: related gesture context
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK(status IN ('PENDING', 'ANSWERED', 'DISMISSED')),
  teacher_answer TEXT,               -- teacher's answer text
  answered_by   TEXT,                -- teacher profile_id
  answered_at   TEXT,                -- ISO timestamp
  created_at    TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(profile_id)
);

-- Fast lookups: all pending for teacher, all for student
CREATE INDEX IF NOT EXISTS idx_student_questions_profile  ON student_questions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_questions_status   ON student_questions(status, created_at DESC);
