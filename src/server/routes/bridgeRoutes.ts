import { Router, type Request, type Response } from 'express';

// Use require() for adapters since they rely on Node.js net module
const {
  startGloveBridge,
  stopGloveBridge,
  getGloveBridgeStatus,
} = require('../adapters/glove_bridge') as typeof import('../adapters/glove_bridge');

const {
  getSpecsBridgeStatus,
} = require('../adapters/specs_bridge') as typeof import('../adapters/specs_bridge');

const router = Router();

// POST /api/bridge/glove/start — starts the glove bridge for a given session
router.post('/glove/start', (req: Request, res: Response) => {
  try {
    const { session_id, profile_id } = req.body as { session_id?: string; profile_id?: string };
    if (!session_id || !profile_id) {
      return res.status(400).json({ ok: false, error: 'session_id and profile_id are required' });
    }
    startGloveBridge(session_id, profile_id);
    return res.json({ ok: true, message: 'Glove bridge started', session_id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/bridge/glove/stop — stops the glove bridge
router.post('/glove/stop', (_req: Request, res: Response) => {
  try {
    stopGloveBridge();
    return res.json({ ok: true, message: 'Glove bridge stopped' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/bridge/glove/status — returns connection status
router.get('/glove/status', (_req: Request, res: Response) => {
  try {
    const status = getGloveBridgeStatus();
    return res.json({ ok: true, ...status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/bridge/specs/status — returns specs connection status
router.get('/specs/status', (_req: Request, res: Response) => {
  try {
    const status = getSpecsBridgeStatus();
    return res.json({ ok: true, ...status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
