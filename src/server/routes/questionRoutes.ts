import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/connection';

const router = Router();

interface StudentQuestion {
  question_id: string;
  profile_id: string;
  question_text: string;
  intent_id: string | null;
  status: 'PENDING' | 'ANSWERED' | 'DISMISSED';
  teacher_answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
}

// ─── POST /api/questions ───────────────────────────────────────────────────
// Student submits a question for their teacher
router.post('/', (req: Request, res: Response) => {
  try {
    const { profile_id, question_text, intent_id } = req.body as {
      profile_id: string;
      question_text: string;
      intent_id?: string;
    };
    if (!profile_id || !question_text?.trim()) {
      return res.status(400).json({ ok: false, error: 'profile_id and question_text required' });
    }
    const db = getDb();
    const question: StudentQuestion = {
      question_id: crypto.randomUUID(),
      profile_id,
      question_text: question_text.trim(),
      intent_id: intent_id ?? null,
      status: 'PENDING',
      teacher_answer: null,
      answered_by: null,
      answered_at: null,
      created_at: new Date().toISOString(),
    };
    db.prepare(`
      INSERT INTO student_questions
        (question_id, profile_id, question_text, intent_id, status, teacher_answer, answered_by, answered_at, created_at)
      VALUES
        (@question_id, @profile_id, @question_text, @intent_id, @status, @teacher_answer, @answered_by, @answered_at, @created_at)
    `).run(question);
    return res.status(201).json({ ok: true, question });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── GET /api/questions?profile_id=... ────────────────────────────────────
// Student: fetch their own questions (with answers)
router.get('/', (req: Request, res: Response) => {
  try {
    const { profile_id } = req.query as { profile_id?: string };
    const db = getDb();
    const questions = profile_id
      ? db.prepare('SELECT * FROM student_questions WHERE profile_id = ? ORDER BY created_at DESC').all(profile_id) as StudentQuestion[]
      : db.prepare('SELECT * FROM student_questions ORDER BY created_at DESC').all() as StudentQuestion[];
    return res.json({ ok: true, questions });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── GET /api/questions/pending ───────────────────────────────────────────
// Teacher: fetch all PENDING questions (across all students)
// Returns joined with profile pseudonymous_code for display
router.get('/pending', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const questions = db.prepare(`
      SELECT sq.*, p.pseudonymous_code AS student_code
      FROM student_questions sq
      LEFT JOIN profiles p ON p.id = sq.profile_id
      WHERE sq.status = 'PENDING'
      ORDER BY sq.created_at ASC
    `).all() as (StudentQuestion & { student_code: string })[];
    return res.json({ ok: true, questions, count: questions.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── GET /api/questions/unread-count ─────────────────────────────────────
// Lightweight endpoint for notification badge — just returns the PENDING count
router.get('/unread-count', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM student_questions WHERE status = 'PENDING'").get() as { count: number };
    return res.json({ ok: true, count: row.count });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── PATCH /api/questions/:id/answer ─────────────────────────────────────
// Teacher answers a question — also auto-indexes the Q&A into knowledge_sources
// so the RAG tutor learns from every teacher answer.
router.patch('/:id/answer', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { teacher_answer, answered_by } = req.body as {
      teacher_answer: string;
      answered_by: string;
    };
    if (!teacher_answer?.trim() || !answered_by) {
      return res.status(400).json({ ok: false, error: 'teacher_answer and answered_by required' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT * FROM student_questions WHERE question_id = ?').get(req.params.id) as StudentQuestion | undefined;
    if (!existing) return res.status(404).json({ ok: false, error: 'Question not found' });

    const now = new Date().toISOString();

    // 1. Save the answer to the question
    db.prepare(`
      UPDATE student_questions
      SET status = 'ANSWERED', teacher_answer = ?, answered_by = ?, answered_at = ?
      WHERE question_id = ?
    `).run(teacher_answer.trim(), answered_by, now, req.params.id);

    // 2. Auto-index this Q&A into knowledge_sources so the RAG tutor learns from it.
    //    Stored as TEACHER_KNOWLEDGE (approved immediately) — globally available to all students
    //    but tagged with the student's profile_id so personalized retrieval ranks it higher.
    try {
      const knowledgeContent =
        `Q: ${existing.question_text.trim()} — A: ${teacher_answer.trim()}`;

      db.prepare(`
        INSERT INTO knowledge_sources (
          source_id, source_class, profile_id, context, intent_id, task_id,
          author_id, author_role, source_title, content, content_type, locale,
          status, version, supersedes_id, session_id, event_id,
          consent_scope, retention_class, created_at, updated_at
        ) VALUES (
          ?, 'TEACHER_KNOWLEDGE', ?, 'LEARNING_PRACTICE', ?, NULL,
          ?, 'TEACHER', ?, ?, 'INSTRUCTION', 'en-IN',
          'APPROVED', 1, NULL, NULL, NULL,
          'LEARNING_PRACTICE', 'PERMANENT_AUDIT', ?, ?
        )
      `).run(
        crypto.randomUUID(),
        existing.profile_id,          // student's profile — personalization weight
        existing.intent_id ?? null,    // gesture context if any
        answered_by,                   // teacher's profile_id as author
        `Teacher Q&A: ${existing.question_text.trim().slice(0, 80)}`, // title
        knowledgeContent,              // "Q: ... — A: ..." for FTS5
        now, now,
      );
    } catch (indexErr) {
      // Non-fatal: answer is saved even if indexing fails
      console.warn('[questionRoutes] Failed to index Q&A into knowledge_sources:', indexErr);
    }

    const updated = db.prepare('SELECT * FROM student_questions WHERE question_id = ?').get(req.params.id) as StudentQuestion;
    return res.json({ ok: true, question: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── PATCH /api/questions/:id/dismiss ─────────────────────────────────────
// Teacher dismisses a question (e.g. duplicate or handled in person)
router.patch('/:id/dismiss', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { answered_by } = req.body as { answered_by: string };
    const db = getDb();
    db.prepare(`
      UPDATE student_questions SET status = 'DISMISSED', answered_by = ?, answered_at = ? WHERE question_id = ?
    `).run(answered_by ?? null, new Date().toISOString(), req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
