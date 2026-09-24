import { Router, type Request, type Response } from 'express';
import { ReplayService } from '../services/ReplayService';

const router = Router();

// GET /api/fixtures
router.get('/', (_req: Request, res: Response) => {
  try {
    const fixtures = ReplayService.getAll();
    return res.json({ ok: true, fixtures });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/fixtures/:id
router.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const fixture = ReplayService.getById(req.params.id);
    if (!fixture) return res.status(404).json({ ok: false, error: 'Fixture not found' });
    return res.json({ ok: true, fixture });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/fixtures/:id/run — run a fixture and return its deterministic state
router.post('/:id/run', (req: Request<{ id: string }>, res: Response) => {
  try {
    const result = ReplayService.run(req.params.id);
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(404).json({ ok: false, error: String(err) });
  }
});

export default router;
