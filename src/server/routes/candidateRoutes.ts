import { Router, type Request, type Response } from 'express';
import { RoutingService } from '../services/RoutingService';
import { DecisionService } from '../services/DecisionService';
import { SessionService } from '../services/SessionService';
import { TeacherKnowledgeService } from '../services/TeacherKnowledgeService';
import type { DecisionAction } from '../../shared/types/decisions';

const router = Router();

// GET /api/sessions/:id/candidates — note: mounted under /api, so path is /sessions/:id/candidates
router.get('/sessions/:id/candidates', (req: Request<{ id: string }>, res: Response) => {
  try {
    const candidates = RoutingService.getCandidatesForSession(req.params.id);
    return res.json({ ok: true, candidates });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/sessions/:id/candidates — create candidate via routing
router.post('/sessions/:id/candidates', (req: Request<{ id: string }>, res: Response) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    const { intent_label, model_score, model_version, quality_passed, profile_id, role } = req.body as {
      intent_label: string; model_score: number | null; model_version?: string;
      quality_passed: boolean; profile_id: string; role: string;
    };
    const candidate = RoutingService.route({
      sessionId: req.params.id, profileId: profile_id, context: session.context,
      role, provenance: session.provenance, intentLabel: intent_label,
      modelScore: model_score ?? null, modelVersion: model_version, qualityPassed: quality_passed ?? false,
    });
    return res.status(201).json({ ok: true, candidate });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

// Helper for decision routes
function handleDecision(action: DecisionAction) {
  return (req: Request<{ id: string }>, res: Response) => {
    try {
      const { final_intent, actor_profile_id, actor_role, note, session_id, profile_id, context, role, provenance } = req.body as {
        final_intent?: string; actor_profile_id?: string; actor_role: string; note?: string;
        session_id: string; profile_id: string; context: string; role: string; provenance: string;
      };
      if (!actor_role || !session_id) return res.status(400).json({ ok: false, error: 'actor_role and session_id are required' });
      const result = DecisionService.record({
        candidateId: req.params.id,
        action, finalIntent: final_intent, actorProfileId: actor_profile_id,
        actorRole: actor_role, note,
        sessionId: session_id, profileId: profile_id,
        context, role, provenance: provenance ?? 'LIVE',
      });
      return res.status(201).json({ ok: true, ...result });
    } catch (err) {
      return res.status(400).json({ ok: false, error: String(err) });
    }
  };
}

// POST /api/candidates/:id/confirm|correct|reject|repeat
router.post('/:id/confirm', handleDecision('CONFIRM'));
router.post('/:id/correct', handleDecision('CORRECT'));
router.post('/:id/reject', handleDecision('REJECT'));
router.post('/:id/repeat', handleDecision('REQUEST_REPEAT'));

// GET /api/candidates/:id/evidence
router.get('/:id/evidence', (req: Request<{ id: string }>, res: Response) => {
  try {
    const candidate = RoutingService.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ ok: false, error: 'Candidate not found' });
    const knowledgeSources = TeacherKnowledgeService.getAll(['APPROVED', 'ACTIVE']).filter(
      ks => ks.intent_id != null && candidate.intent_label != null && ks.intent_id.includes(candidate.intent_label)
    );
    return res.json({ ok: true, candidate, evidence: knowledgeSources });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/candidates/:id/decisions
router.get('/:id/decisions', (req: Request<{ id: string }>, res: Response) => {
  try {
    const decisions = DecisionService.getDecisionsForCandidate(req.params.id);
    return res.json({ ok: true, decisions });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/teacher/review-queue — all REVIEW_REQUIRED candidates across all student sessions
// Teacher→Student connection: student gesture below 75% → appears here for teacher review
router.get('/teacher/review-queue', (_req: Request, res: Response) => {
  try {
    const { getDb } = require('../db/connection') as { getDb: () => import('better-sqlite3').Database };
    const database = getDb();

    // Join candidates → sessions → profiles to get full context
    const reviewItems = database.prepare(`
      SELECT
        c.candidate_id,
        c.intent_label,
        c.score,
        c.policy_route,
        c.why_reason_code,
        c.created_at,
        s.id as session_id,
        s.profile_id,
        s.context,
        s.provenance,
        p.pseudonymous_code,
        p.role as profile_role
      FROM candidates c
      JOIN sessions s ON s.id = c.session_id
      JOIN profiles p ON p.id = s.profile_id
      WHERE c.policy_route = 'REVIEW_REQUIRED'
        AND p.role = 'STUDENT'
        AND NOT EXISTS (
          SELECT 1 FROM human_decisions hd WHERE hd.candidate_id = c.candidate_id
        )
      ORDER BY c.created_at DESC
      LIMIT 50
    `).all();

    return res.json({ ok: true, reviewItems });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
