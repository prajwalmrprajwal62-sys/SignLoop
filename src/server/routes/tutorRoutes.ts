import { Router, type Request, type Response } from 'express';
import { RetrievalService } from '../services/RetrievalService';
import { GroundingValidator } from '../services/GroundingValidator';
import { getDb } from '../db/connection';
import type { TutorQueryType } from '../../shared/types/retrieval';
import type { TutorResponse } from '../../shared/types/retrieval';

const router = Router();

// POST /api/retrieval/run — execute a retrieval
router.post('/retrieval/run', (req: Request, res: Response) => {
  try {
    const { profile_id, context, role, consent_granted, query_text, intent_id, query_type, session_id } = req.body as {
      profile_id: string; context: string; role: string; consent_granted: boolean;
      query_text: string; intent_id?: string; query_type: string; session_id?: string;
    };
    if (!profile_id || !context || !query_type) {
      return res.status(400).json({ ok: false, error: 'profile_id, context, query_type required' });
    }
    const { results, retrievalId } = RetrievalService.retrieve({
      profileId: profile_id, context, role: role ?? 'STUDENT',
      consentGranted: consent_granted ?? false,
      queryText: query_text ?? '',
      intentId: intent_id,
      queryType: query_type as TutorQueryType,
      sessionId: session_id,
    });
    return res.json({ ok: true, retrieval_id: retrievalId, results });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

// POST /api/tutor/respond — generate grounded tutor response
router.post('/tutor/respond', (req: Request, res: Response) => {
  try {
    const {
      profile_id, context, role, consent_granted,
      query_text, intent_id, query_type, session_id,
    } = req.body as {
      profile_id: string; context: string; role: string; consent_granted: boolean;
      query_text: string; intent_id?: string; query_type: string; session_id?: string;
    };
    if (!profile_id || !context || !query_type) {
      return res.status(400).json({ ok: false, error: 'profile_id, context, query_type required' });
    }

    // Step 1: Retrieve
    const { results, retrievalId } = RetrievalService.retrieve({
      profileId: profile_id, context, role: role ?? 'STUDENT',
      consentGranted: consent_granted ?? false,
      queryText: query_text ?? '',
      intentId: intent_id,
      queryType: query_type as TutorQueryType,
      sessionId: session_id,
    });

    // Step 2: Validate grounding
    const run = RetrievalService.getRunById(retrievalId) as { status: string } | undefined;
    const hasConflict = run?.status === 'CONFLICT';
    const validation = GroundingValidator.validate({
      results,
      queryType: query_type,
      hasConflict,
      intentId: intent_id,
    });

    // Step 3: Persist tutor response
    const db = getDb();
    const now = new Date().toISOString();
    const responseId = crypto.randomUUID();
    const tutorResponse: TutorResponse = {
      response_id: responseId,
      retrieval_id: retrievalId,
      answer_type: query_type,
      answer_text: validation.answer_text,
      recommended_action: null,
      source_ids_json: JSON.stringify(validation.source_ids),
      evidence_window: null,
      retrieval_status: validation.status,
      abstention_reason: validation.abstention_reason,
      policy_version: 'rag-policy-v1',
      index_version: 'local-fts-v1',
      created_at: now,
    };

    db.prepare(`
      INSERT INTO tutor_responses (
        response_id, retrieval_id, answer_type, answer_text, recommended_action,
        source_ids_json, evidence_window, retrieval_status, abstention_reason,
        policy_version, index_version, created_at
      ) VALUES (
        @response_id, @retrieval_id, @answer_type, @answer_text, @recommended_action,
        @source_ids_json, @evidence_window, @retrieval_status, @abstention_reason,
        @policy_version, @index_version, @created_at
      )
    `).run(tutorResponse);

    return res.status(201).json({ ok: true, response: tutorResponse });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

// GET /api/tutor/responses/:id
router.get('/tutor/responses/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const db = getDb();
    const response = db.prepare('SELECT * FROM tutor_responses WHERE response_id = ?').get(req.params.id);
    if (!response) return res.status(404).json({ ok: false, error: 'Response not found' });
    return res.json({ ok: true, response });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;

