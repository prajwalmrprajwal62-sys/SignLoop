import { Router, type Request, type Response } from 'express';
import { SessionService } from '../services/SessionService';
import { QualityService } from '../services/QualityService';
import { RoutingService } from '../services/RoutingService';
import type { SourceType, Provenance } from '../../shared/types/sessions';

const router = Router();

// POST /api/sessions — start a new session
router.post('/', (req: Request, res: Response) => {
  try {
    const { profile_id, context, role, source_modality, provenance } = req.body as {
      profile_id: string; context: string; role: string; source_modality: string; provenance: string;
    };
    if (!profile_id || !context || !role || !source_modality) {
      return res.status(400).json({ ok: false, error: 'profile_id, context, role, source_modality are required' });
    }
    const session = SessionService.start({
      profile_id,
      context,
      role,
      source_modality: source_modality as SourceType,
      provenance: (provenance ?? 'LIVE') as Provenance,
    });
    return res.status(201).json({ ok: true, session });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/sessions/:id/end
router.post('/:id/end', (req: Request<{ id: string }>, res: Response) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    SessionService.end(req.params.id);
    return res.json({ ok: true, message: 'Session ended' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/sessions/:id/timeline
router.get('/:id/timeline', (req: Request<{ id: string }>, res: Response) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    const events = SessionService.getTimeline(req.params.id);
    return res.json({ ok: true, events });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/sessions/:id/quality/check — run quality gate checks
router.post('/:id/quality/check', (req: Request<{ id: string }>, res: Response) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    const inputData = (req.body as Record<string, unknown>) ?? {};
    const checkInput = {
      source_type: session.source_modality,
      quality_pass: inputData['quality_pass'] ?? (session.source_modality === 'SIMULATED' || session.source_modality === 'REPLAY'),
      force_quality_fail: inputData['force_quality_fail'] ?? null,
      ...inputData,
    };
    const result = QualityService.runChecks(req.params.id, checkInput);
    return res.json({ ok: true, quality: result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/sessions/:id/observation — emit a candidate from observation
router.post('/:id/observation', (req: Request<{ id: string }>, res: Response) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    const { intent_label, model_score, model_version, quality_passed, profile_id, role } = req.body as {
      intent_label: string; model_score: number | null; model_version?: string;
      quality_passed: boolean; profile_id: string; role: string;
    };
    if (!intent_label) return res.status(400).json({ ok: false, error: 'intent_label is required' });
    const candidate = RoutingService.route({
      sessionId: req.params.id,
      profileId: profile_id,
      context: session.context,
      role,
      provenance: session.provenance,
      intentLabel: intent_label,
      modelScore: model_score ?? null,
      modelVersion: model_version,
      qualityPassed: quality_passed ?? false,
    });
    return res.status(201).json({ ok: true, candidate });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

// POST /api/sessions/:id/source/select — select source type for session
router.post('/:id/source/select', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { source_modality } = req.body as { source_modality: string };
    return res.json({ ok: true, session_id: req.params.id, source_modality });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
