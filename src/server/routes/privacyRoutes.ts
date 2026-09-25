import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/connection';
import { ProfileService } from '../services/ProfileService';

const router = Router();

// GET /api/privacy/status/:profileId
router.get('/status/:profileId', (req: Request<{ profileId: string }>, res: Response) => {
  try {
    const profile = ProfileService.getById(req.params.profileId);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found' });
    const db = getDb();
    const consents = db.prepare('SELECT * FROM consent_and_retention WHERE profile_id = ?').all(req.params.profileId);
    const contexts = ProfileService.getContextsForProfile(req.params.profileId);
    return res.json({ ok: true, profile, consents, contexts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/privacy/export/:profileId — export all profile data (flattened for frontend)
router.get('/export/:profileId', (req: Request<{ profileId: string }>, res: Response) => {
  try {
    const db = getDb();
    const profile = ProfileService.getById(req.params.profileId);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found' });
    const sessions = db.prepare('SELECT * FROM sessions WHERE profile_id = ?').all(req.params.profileId);
    const candidates = db.prepare(`
      SELECT c.* FROM candidates c
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
    `).all(req.params.profileId);
    const decisions = db.prepare(`
      SELECT hd.* FROM human_decisions hd
      JOIN candidates c ON c.candidate_id = hd.candidate_id
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
    `).all(req.params.profileId);
    const approved_outputs = db.prepare(`
      SELECT ao.* FROM approved_outputs ao
      JOIN human_decisions hd ON hd.decision_id = ao.decision_id
      JOIN candidates c ON c.candidate_id = hd.candidate_id
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
    `).all(req.params.profileId);
    const tasks = db.prepare('SELECT * FROM practice_tasks WHERE profile_id = ?').all(req.params.profileId);
    const events_count_row = db.prepare(
      'SELECT COUNT(*) as count FROM events WHERE profile_id = ?'
    ).get(req.params.profileId) as { count: number } | undefined;
    // Return flat (not nested under 'export') — frontend reads res.profile, res.sessions, etc.
    return res.json({
      ok: true,
      profile,
      sessions,
      candidates,
      decisions,
      approved_outputs,
      tasks,
      events_count: events_count_row?.count ?? 0,
      exported_at: new Date().toISOString(),
      notice: 'SAVED_LOCALLY — data stored in local SQLite database only.',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/privacy/export/:profileId — same as GET version
router.post('/export/:profileId', (req: Request<{ profileId: string }>, res: Response) => {
  try {
    const db = getDb();
    const profile = ProfileService.getById(req.params.profileId);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found' });
    const sessions = db.prepare('SELECT * FROM sessions WHERE profile_id = ?').all(req.params.profileId);
    const candidates = db.prepare(`
      SELECT c.* FROM candidates c
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
    `).all(req.params.profileId);
    const decisions = db.prepare(`
      SELECT hd.* FROM human_decisions hd
      JOIN candidates c ON c.candidate_id = hd.candidate_id
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
    `).all(req.params.profileId);
    const approved_outputs = db.prepare(`
      SELECT ao.* FROM approved_outputs ao
      JOIN human_decisions hd ON hd.decision_id = ao.decision_id
      JOIN candidates c ON c.candidate_id = hd.candidate_id
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ?
    `).all(req.params.profileId);
    const tasks = db.prepare('SELECT * FROM practice_tasks WHERE profile_id = ?').all(req.params.profileId);
    const events_count_row = db.prepare(
      'SELECT COUNT(*) as count FROM events WHERE profile_id = ?'
    ).get(req.params.profileId) as { count: number } | undefined;
    return res.json({
      ok: true,
      profile,
      sessions,
      candidates,
      decisions,
      approved_outputs,
      tasks,
      events_count: events_count_row?.count ?? 0,
      exported_at: new Date().toISOString(),
      notice: 'SAVED_LOCALLY — data stored in local SQLite database only.',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/privacy/delete/:profileId — soft delete (mark DELETED)
router.post('/delete/:profileId', (req: Request<{ profileId: string }>, res: Response) => {
  try {
    const { confirm } = req.body as { confirm: boolean };
    if (!confirm) return res.status(400).json({ ok: false, error: 'confirm: true required' });
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare("UPDATE profiles SET visibility_status = 'DELETED', updated_at = ? WHERE id = ?").run(now, req.params.profileId);
    return res.json({ ok: true, message: 'Profile marked DELETED. Raw session data retained per retention policy.' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/privacy/revoke/:profileId — revoke all consents
router.post('/revoke/:profileId', (req: Request<{ profileId: string }>, res: Response) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare("UPDATE profile_contexts SET consent_status = 'REVOKED', updated_at = ? WHERE profile_id = ?").run(now, req.params.profileId);
    db.prepare("UPDATE consent_and_retention SET status = 'REVOKED', revoked_at = ? WHERE profile_id = ?").run(now, req.params.profileId);
    return res.json({ ok: true, message: 'All consents revoked. Future retrieval blocked.' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
