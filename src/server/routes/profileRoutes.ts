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

export default router;
