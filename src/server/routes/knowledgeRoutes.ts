import { Router, type Request, type Response } from 'express';
import { TeacherKnowledgeService } from '../services/TeacherKnowledgeService';
import { RetrievalService } from '../services/RetrievalService';
import type { KnowledgeSource } from '../../shared/types/knowledge';
import type { TutorQueryType } from '../../shared/types/retrieval';

const router = Router();

// GET /api/knowledge/sources
router.get('/sources', (req: Request, res: Response) => {
  try {
    const { profile_id } = req.query as { profile_id?: string };
    const sources = profile_id
      ? TeacherKnowledgeService.getForProfile(profile_id)
      : TeacherKnowledgeService.getAll();
    return res.json({ ok: true, sources });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/knowledge/sources
router.post('/sources', (req: Request, res: Response) => {
  try {
    const data = req.body as Omit<KnowledgeSource, 'source_id' | 'created_at' | 'updated_at' | 'version' | 'status'>;
    if (!data.content || !data.source_class) {
      return res.status(400).json({ ok: false, error: 'content and source_class are required' });
    }
    const source = TeacherKnowledgeService.create(data);
    return res.status(201).json({ ok: true, source });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/knowledge/sources/:id
router.get('/sources/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const source = TeacherKnowledgeService.getById(req.params.id);
    if (!source) return res.status(404).json({ ok: false, error: 'Source not found' });
    return res.json({ ok: true, source });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/knowledge/sources/:id/approve
router.post('/sources/:id/approve', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { author_id } = req.body as { author_id: string };
    if (!author_id) return res.status(400).json({ ok: false, error: 'author_id required' });
    const source = TeacherKnowledgeService.approve(req.params.id, author_id);
    return res.json({ ok: true, source });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

// POST /api/knowledge/sources/:id/supersede
router.post('/sources/:id/supersede', (req: Request<{ id: string }>, res: Response) => {
  try {
    const body = req.body as {
      author_id: string;
    } & Omit<KnowledgeSource, 'source_id' | 'created_at' | 'updated_at' | 'version' | 'status'>;
    if (!body.author_id) return res.status(400).json({ ok: false, error: 'author_id required' });
    const { author_id, ...rest } = body;
    const newData = { ...rest, author_id };
    const source = TeacherKnowledgeService.supersede(req.params.id, newData, author_id);
    return res.status(201).json({ ok: true, source });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});


// POST /api/knowledge/sources/:id/revoke
router.post('/sources/:id/revoke', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { author_id } = req.body as { author_id: string };
    if (!author_id) return res.status(400).json({ ok: false, error: 'author_id required' });
    TeacherKnowledgeService.revoke(req.params.id, author_id);
    return res.json({ ok: true, message: `Source ${req.params.id} revoked` });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

// GET /api/knowledge/retrieval-preview
router.get('/retrieval-preview', (req: Request, res: Response) => {
  try {
    const { profile_id, context, query_text, intent_id } = req.query as {
      profile_id?: string; context?: string; query_text?: string; intent_id?: string;
    };
    if (!profile_id || !context) {
      return res.status(400).json({ ok: false, error: 'profile_id and context required' });
    }
    const { results, retrievalId } = RetrievalService.retrieve({
      profileId: profile_id,
      context,
      role: 'TEACHER',
      consentGranted: true,
      queryText: query_text ?? '',
      intentId: intent_id,
      queryType: 'SHOW_REFERENCE' as TutorQueryType,
    });
    return res.json({ ok: true, results, retrieval_id: retrievalId });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err) });
  }
});

export default router;
