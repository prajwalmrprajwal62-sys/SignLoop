// commRoutes.ts — Staff communication audit trail
// Records every phrase the communicator/staff confirms or repeats to the system.
// This makes the Communication page's TTS outputs auditable alongside the rest of the pipeline.

import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

interface CommEventBody {
  profile_id: string;
  intent_id: string;
  caption_text: string;
  action: 'CONFIRMED' | 'REPEATED' | 'CANCELLED';
}

// POST /api/comm/event — record a phrase output from the Communication page
router.post('/event', (req, res) => {
  const body = req.body as CommEventBody;
  if (!body.profile_id || !body.intent_id || !body.caption_text || !body.action) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const db = getDb();
  const eventId = crypto.randomUUID();
  const occurredAt = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO comm_events (event_id, profile_id, intent_id, caption_text, action, tts_provider, occurred_at)
      VALUES (?, ?, ?, ?, ?, 'WEB_SPEECH_API', ?)
    `).run(eventId, body.profile_id, body.intent_id, body.caption_text, body.action, occurredAt);

    res.status(201).json({ event_id: eventId, occurred_at: occurredAt });
  } catch (err) {
    console.error('[CommRoutes] Failed to insert comm_event:', err);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// GET /api/comm/events/:profileId — recent comm events for a staff profile
router.get('/events/:profileId', (req, res) => {
  const db = getDb();
  const events = db.prepare(`
    SELECT event_id, intent_id, caption_text, action, occurred_at
    FROM comm_events
    WHERE profile_id = ?
    ORDER BY occurred_at DESC
    LIMIT 50
  `).all(req.params.profileId);
  res.json(events);
});

export { router as commRouter };
