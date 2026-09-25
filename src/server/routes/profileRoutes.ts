import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { ProfileService } from '../services/ProfileService';
import { getDb } from '../db/connection';
import type { Role } from '../../shared/types/profiles';

/** Simple SHA-256 hash — local-only, no bcrypt needed */
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

const router = Router();

// POST /api/profiles/register — register a new profile with optional PIN
router.post('/register', (req: Request, res: Response) => {
  try {
    const { pseudonymous_code, role, preferred_locale, pin } = req.body as {
      pseudonymous_code?: string; role?: string; preferred_locale?: string; pin?: string;
    };
    if (!pseudonymous_code || !role) {
      return res.status(400).json({ ok: false, error: 'pseudonymous_code and role are required' });
    }
    if (!['STUDENT', 'TEACHER', 'STAFF'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'role must be STUDENT, TEACHER, or STAFF' });
    }

    // Check if pseudonymous_code already exists
    const db = getDb();
    const existing = db.prepare('SELECT id FROM profiles WHERE pseudonymous_code = ?').get(pseudonymous_code);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'pseudonymous_code already registered' });
    }

    // Create the profile
    const profile = ProfileService.create({
      pseudonymous_code,
      role: role as Role,
      preferred_locale: preferred_locale ?? 'en-IN',
      visibility_status: 'ACTIVE',
    });

    // Store PIN hash if provided
    if (pin) {
      db.prepare('UPDATE profiles SET pin_hash = ? WHERE id = ?').run(hashPin(pin), profile.id);
    }

    // Create default profile_contexts (LEARNING_PRACTICE + REAL_WORLD_INTERACTION)
    const now = new Date().toISOString();
    const insertCtx = db.prepare(`
      INSERT INTO profile_contexts (id, profile_id, context_type, consent_status, output_modality, active, created_at, updated_at)
      VALUES (?, ?, ?, 'GRANTED', 'TEXT_AND_AUDIO', 1, ?, ?)
    `);
    insertCtx.run(crypto.randomUUID(), profile.id, 'LEARNING_PRACTICE', now, now);
    insertCtx.run(crypto.randomUUID(), profile.id, 'REAL_WORLD_INTERACTION', now, now);

    const contexts = ProfileService.getContextsForProfile(profile.id);
    return res.status(201).json({ ok: true, profile, contexts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/profiles/login — authenticate by pseudonymous_code + optional PIN
router.post('/login', (req: Request, res: Response) => {
  try {
    const { pseudonymous_code, pin } = req.body as { pseudonymous_code?: string; pin?: string };
    if (!pseudonymous_code) {
      return res.status(400).json({ ok: false, error: 'pseudonymous_code is required' });
    }

    const db = getDb();
    const row = db.prepare('SELECT * FROM profiles WHERE pseudonymous_code = ?').get(pseudonymous_code) as
      | (Record<string, unknown> & { id: string; pin_hash?: string | null })
      | undefined;

    if (!row) {
      return res.status(404).json({ ok: false, error: 'Profile not found' });
    }

    // Verify PIN if one was set
    if (row.pin_hash) {
      if (!pin) {
        return res.status(401).json({ ok: false, error: 'PIN required' });
      }
      if (hashPin(pin) !== row.pin_hash) {
        return res.status(401).json({ ok: false, error: 'Invalid PIN' });
      }
    }

    const profile = ProfileService.getById(row.id);
    const contexts = ProfileService.getContextsForProfile(row.id);
    return res.json({ ok: true, profile, contexts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/profiles — list all active profiles
router.get('/', (_req: Request, res: Response) => {
  try {
    const profiles = ProfileService.getAll();
    res.json({ ok: true, profiles });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/profiles — create profile
router.post('/', (req: Request, res: Response) => {
  try {
    const { pseudonymous_code, role, preferred_locale, visibility_status } = req.body as {
      pseudonymous_code: string; role: string; preferred_locale: string; visibility_status: string;
    };
    if (!pseudonymous_code || !role) {
      return res.status(400).json({ ok: false, error: 'pseudonymous_code and role are required' });
    }
    const profile = ProfileService.create({
      pseudonymous_code,
      role: role as Role,
      preferred_locale: preferred_locale ?? 'en-IN',
      visibility_status: (visibility_status ?? 'ACTIVE') as 'ACTIVE' | 'ARCHIVED' | 'DELETED',
    });
    return res.status(201).json({ ok: true, profile });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/profiles/:id
router.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const profile = ProfileService.getById(req.params.id);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found' });
    return res.json({ ok: true, profile });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/profiles/:id/select — returns profile + contexts
router.post('/:id/select', (req: Request<{ id: string }>, res: Response) => {
  try {
    const profile = ProfileService.getById(req.params.id);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found' });
    const contexts = ProfileService.getContextsForProfile(req.params.id);
    return res.json({ ok: true, profile, contexts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/profiles/:id/contexts
router.get('/:id/contexts', (req: Request<{ id: string }>, res: Response) => {
  try {
    const profile = ProfileService.getById(req.params.id);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found' });
    const contexts = ProfileService.getContextsForProfile(req.params.id);
    return res.json({ ok: true, contexts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/profiles/:id/summary — rich student performance summary for teacher view
router.get('/:id/summary', (req: Request<{ id: string }>, res: Response) => {
  try {
    const db = getDb();
    const profile = ProfileService.getById(req.params.id);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found' });

    // Total sessions
    const sessionCount = (db.prepare(
      'SELECT COUNT(*) as count FROM sessions WHERE profile_id = ?'
    ).get(req.params.id) as { count: number }).count;

    // Session context breakdown
    const sessionsByContext = db.prepare(`
      SELECT context, COUNT(*) as count FROM sessions WHERE profile_id = ? GROUP BY context
    `).all(req.params.id) as Array<{ context: string; count: number }>;

    // Total candidates emitted
    const candidateCount = (db.prepare(`
      SELECT COUNT(*) as count FROM candidates c
      JOIN sessions s ON s.id = c.session_id WHERE s.profile_id = ?
    `).get(req.params.id) as { count: number }).count;

    // Routing breakdown — how many passed gate vs needed review vs invalid
    const routingBreakdown = db.prepare(`
      SELECT c.policy_route, COUNT(*) as count FROM candidates c
      JOIN sessions s ON s.id = c.session_id WHERE s.profile_id = ?
      GROUP BY c.policy_route
    `).all(req.params.id) as Array<{ policy_route: string; count: number }>;

    // Approved outputs (confirmed or corrected gestures)
    const approvedOutputs = db.prepare(`
      SELECT ao.final_intent, ao.caption_text, ao.created_at FROM approved_outputs ao
      JOIN human_decisions hd ON hd.decision_id = ao.decision_id
      JOIN candidates c ON c.candidate_id = hd.candidate_id
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
      ORDER BY ao.created_at DESC LIMIT 10
    `).all(req.params.id) as Array<{ final_intent: string; caption_text: string; created_at: string }>;

    // Most communicated gestures
    const topGestures = db.prepare(`
      SELECT ao.final_intent, COUNT(*) as count FROM approved_outputs ao
      JOIN human_decisions hd ON hd.decision_id = ao.decision_id
      JOIN candidates c ON c.candidate_id = hd.candidate_id
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
      GROUP BY ao.final_intent ORDER BY count DESC LIMIT 5
    `).all(req.params.id) as Array<{ final_intent: string; count: number }>;

    // Gestures that most often needed REVIEW_REQUIRED (struggling with)
    const reviewRequiredByGesture = db.prepare(`
      SELECT c.intent_label, COUNT(*) as count FROM candidates c
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ? AND c.policy_route = 'REVIEW_REQUIRED'
      GROUP BY c.intent_label ORDER BY count DESC LIMIT 5
    `).all(req.params.id) as Array<{ intent_label: string; count: number }>;

    // Average model score (only non-null scores)
    const avgScoreRow = db.prepare(`
      SELECT AVG(c.score) as avg_score FROM candidates c
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ? AND c.score IS NOT NULL
    `).get(req.params.id) as { avg_score: number | null };

    // Teacher notes written for this student
    const teacherNoteCount = (db.prepare(
      "SELECT COUNT(*) as count FROM knowledge_sources WHERE profile_id = ? AND source_class = 'TEACHER_KNOWLEDGE'"
    ).get(req.params.id) as { count: number }).count;

    // Last active timestamp
    const lastSessionRow = db.prepare(
      'SELECT started_at FROM sessions WHERE profile_id = ? ORDER BY started_at DESC LIMIT 1'
    ).get(req.params.id) as { started_at: string } | undefined;

    return res.json({
      ok: true,
      summary: {
        profile,
        stats: {
          total_sessions: sessionCount,
          total_candidates: candidateCount,
          approved_outputs_count: approvedOutputs.length,
          teacher_notes_count: teacherNoteCount,
          avg_model_score: avgScoreRow.avg_score != null
            ? Math.round(avgScoreRow.avg_score * 100)
            : null,
          last_active: lastSessionRow?.started_at ?? null,
        },
        sessions_by_context: sessionsByContext,
        routing_breakdown: routingBreakdown,
        top_gestures: topGestures,
        struggling_gestures: reviewRequiredByGesture,
        recent_outputs: approvedOutputs,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
