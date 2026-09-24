import { Router, type Request, type Response } from 'express';
import { PhraseOutputService } from '../services/PhraseOutputService';

const router = Router();

// POST /api/audio/request
router.post('/request', (req: Request, res: Response) => {
  try {
    const { output_id, intent, locale, session_id, profile_id, context, provenance } = req.body as {
      output_id: string; intent: string; locale?: string; session_id: string;
      profile_id: string; context: string; provenance?: string;
    };
    if (!output_id || !intent || !session_id) {
      return res.status(400).json({ ok: false, error: 'output_id, intent, session_id required' });
    }
    const audioEvent = PhraseOutputService.requestAudio({
      outputId: output_id,
      intent,
      locale: locale ?? 'en-IN',
      sessionId: session_id,
      profileId: profile_id,
      context,
      provenance: provenance ?? 'LIVE',
    });
    return res.status(201).json({ ok: true, audioEvent });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/audio/:id/started
router.post('/:id/started', (req: Request<{ id: string }>, res: Response) => {
  try {
    PhraseOutputService.updateAudioState(req.params.id, 'AUDIO_STARTED');
    return res.json({ ok: true, message: 'Audio started' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/audio/:id/completed
router.post('/:id/completed', (req: Request<{ id: string }>, res: Response) => {
  try {
    PhraseOutputService.updateAudioState(req.params.id, 'AUDIO_COMPLETED');
    return res.json({ ok: true, message: 'Audio completed' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/audio/:id/failed
router.post('/:id/failed', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { failure_reason } = req.body as { failure_reason?: string };
    PhraseOutputService.updateAudioState(req.params.id, 'AUDIO_FAILED', failure_reason);
    return res.json({ ok: true, message: 'Audio failed recorded' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
