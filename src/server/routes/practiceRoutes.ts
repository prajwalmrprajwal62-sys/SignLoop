import { Router, type Request, type Response } from 'express';
import { PracticeService } from '../services/PracticeService';
import type { PracticeTask } from '../../shared/types/practice';

const router = Router();

// GET /api/practice/tasks
router.get('/tasks', (req: Request, res: Response) => {
  try {
    const { profile_id } = req.query as { profile_id?: string };
    if (!profile_id) return res.status(400).json({ ok: false, error: 'profile_id query param required' });
    const tasks = PracticeService.getTasks(profile_id);
    return res.json({ ok: true, tasks });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/practice/tasks
router.post('/tasks', (req: Request, res: Response) => {
  try {
    const data = req.body as Omit<PracticeTask, 'task_id' | 'created_at' | 'completed_repetitions'>;
    if (!data.profile_id || !data.intent_id) {
      return res.status(400).json({ ok: false, error: 'profile_id and intent_id required' });
    }
    const task = PracticeService.createTask(data);
    return res.status(201).json({ ok: true, task });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/practice/tasks/:id
router.get('/tasks/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const task = PracticeService.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ ok: false, error: 'Task not found' });
    return res.json({ ok: true, task });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/practice/tasks/:id/complete
router.post('/tasks/:id/complete', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { reps_added } = req.body as { reps_added?: number };
    const task = PracticeService.completeTask(req.params.id, reps_added ?? 1);
    return res.json({ ok: true, task });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

// GET /api/practice/followups
router.get('/followups', (req: Request, res: Response) => {
  try {
    const { profile_id } = req.query as { profile_id?: string };
    if (!profile_id) return res.status(400).json({ ok: false, error: 'profile_id query param required' });
    const followUps = PracticeService.getFollowUps(profile_id);
    return res.json({ ok: true, followUps });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/practice/followups/:id/compare
router.post('/followups/:id/compare', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { profile_id, intent_id, before_cutoff, after_cutoff, minimum_eligible_attempts } = req.body as {
      profile_id: string; intent_id: string; before_cutoff: string; after_cutoff: string; minimum_eligible_attempts: number;
    };
    if (!profile_id || !intent_id || !before_cutoff || !after_cutoff) {
      return res.status(400).json({ ok: false, error: 'profile_id, intent_id, before_cutoff, after_cutoff required' });
    }
    const comparison = PracticeService.compareFollowUp({
      profileId: profile_id,
      intentId: intent_id,
      beforeCutoff: before_cutoff,
      afterCutoff: after_cutoff,
      minimumEligibleAttempts: minimum_eligible_attempts ?? 5,
    });
    return res.json({ ok: true, comparison });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
