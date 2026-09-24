import { Router, type Request, type Response } from 'express';
import { ProfileService } from '../services/ProfileService';
import type { Role } from '../../shared/types/profiles';

const router = Router();

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
