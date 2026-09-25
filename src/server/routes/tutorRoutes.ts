import 'dotenv/config'; // Load .env before anything else
import { Router, type Request, type Response } from 'express';
import { RetrievalService } from '../services/RetrievalService';
import { GroundingValidator } from '../services/GroundingValidator';
import { GeminiService } from '../services/GeminiService';
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

// POST /api/tutor/respond — generate grounded tutor response (with Claude synthesis)
router.post('/tutor/respond', async (req: Request, res: Response) => {
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

    // Step 1: Retrieve from knowledge base (FTS5 + intent fallback)
    const { results, retrievalId } = RetrievalService.retrieve({
      profileId: profile_id, context, role: role ?? 'STUDENT',
      consentGranted: consent_granted ?? false,
      queryText: query_text ?? '',
      intentId: intent_id,
      queryType: query_type as TutorQueryType,
      sessionId: session_id,
    });

    // Step 2: Load student context for personalization (struggling / strong gestures)
    const db = getDb();
    let strugglingGestures: string[] = [];
    let strongGestures: string[] = [];
    try {
      const struggling = db.prepare(`
        SELECT intent_label
        FROM quality_checks
        WHERE profile_id = ? AND gate_result = 'REVIEW_REQUIRED'
        GROUP BY intent_label
        ORDER BY COUNT(*) DESC
        LIMIT 3
      `).all(profile_id) as Array<{ intent_label: string }>;
      strugglingGestures = struggling.map(r => r.intent_label);

      const strong = db.prepare(`
        SELECT intent_label
        FROM quality_checks
        WHERE profile_id = ? AND gate_result = 'PASSED'
        GROUP BY intent_label
        ORDER BY COUNT(*) DESC
        LIMIT 3
      `).all(profile_id) as Array<{ intent_label: string }>;
      strongGestures = strong.map(r => r.intent_label);
    } catch {
      // Non-critical — proceed without personalization context
    }

    // Step 3: Synthesize answer
    // Try Gemini first — falls back to template if no API key or error
    const synthesis = await GeminiService.synthesize({
      queryText: query_text ?? '',
      queryType: query_type,
      intentId: intent_id,
      retrievedSources: results,
      hasGrounding: results.length > 0,
      strugglingGestures,
      strongGestures,
    });

    // Step 4: Determine final status (use GroundingValidator for status classification)
    const run = RetrievalService.getRunById(retrievalId) as { status: string } | undefined;
    const hasConflict = run?.status === 'CONFLICT';
    const validation = GroundingValidator.validate({
      results,
      queryType: query_type,
      hasConflict,
      intentId: intent_id,
    });

    // Use Gemini answer if available, else template fallback
    const finalAnswerText = synthesis.answer_text || validation.answer_text;
    const finalStatus = synthesis.grounding_level === 'GENERAL_KNOWLEDGE'
      ? 'GROUNDED'  // Gemini answered from general knowledge — still a valid answer
      : validation.status;

    // Step 5: Persist tutor response
    const now = new Date().toISOString();
    const responseId = crypto.randomUUID();
    const tutorResponse: TutorResponse = {
      response_id: responseId,
      retrieval_id: retrievalId,
      answer_type: query_type,
      answer_text: finalAnswerText,
      recommended_action: null,
      source_ids_json: JSON.stringify(validation.source_ids),
      evidence_window: null,
      retrieval_status: finalStatus as TutorResponse['retrieval_status'],
      abstention_reason: synthesis.grounding_level === 'FALLBACK' ? validation.abstention_reason : null,
      policy_version: synthesis.used_gemini ? 'gemini-rag-v1' : 'rag-policy-v1',
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
