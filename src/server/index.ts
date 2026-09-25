import 'dotenv/config'; // Must be first — loads .env before any service reads process.env
import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import profileRoutes from './routes/profileRoutes';
import sessionRoutes from './routes/sessionRoutes';
import candidateRoutes from './routes/candidateRoutes';
import practiceRoutes from './routes/practiceRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import tutorRoutes from './routes/tutorRoutes';
import fixtureRoutes from './routes/fixtureRoutes';
import privacyRoutes from './routes/privacyRoutes';
import audioRoutes from './routes/audioRoutes';
import bridgeRoutes from './routes/bridgeRoutes';
import questionRoutes from './routes/questionRoutes';
import { getDb, closeDb } from './db/connection';

const app = express();
const PORT = process.env.PORT || 3001;

// Standard middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger for diagnostic trace
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

/**
 * GET /api/health
 * Returns server and database health verification status for Milestone M1
 */
app.get('/api/health', (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // Check PRAGMA settings
    const journalModeRow = db.pragma('journal_mode', { simple: true }) as string;
    const foreignKeysRow = db.pragma('foreign_keys', { simple: true }) as number;

    // Check table count in sqlite_master
    const tableCountRow = db
      .prepare(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
      )
      .get() as { count: number };

    // Check knowledge_sources_fts presence
    const ftsCheck = db
      .prepare(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table' AND name = 'knowledge_sources_fts'`
      )
      .get() as { count: number };

    // Check seed profile presence
    let profileCount = 0;
    try {
      const pRow = db.prepare(`SELECT COUNT(*) as count FROM profiles`).get() as { count: number };
      profileCount = pRow.count;
    } catch {
      // Table might not exist yet if migrations haven't run
      profileCount = 0;
    }

    const isMigrated = tableCountRow.count >= 16; // 15 relational tables + FTS5 tables

    res.status(200).json({
      ok: true,
      service: 'signloop-website-server',
      port: PORT,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: {
        connected: true,
        journalMode: journalModeRow,
        foreignKeysEnabled: foreignKeysRow === 1,
        totalTables: tableCountRow.count,
        ftsVirtualTableActive: ftsCheck.count > 0,
        isMigrated,
        seedProfilesCount: profileCount
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[SERVER HEALTH CHECK FAILED]:', error);
    res.status(500).json({
      ok: false,
      service: 'signloop-website-server',
      error: {
        code: 'DATABASE_HEALTH_FAILED',
        message
      }
    });
  }
});

// Mount all API routes
app.use('/api/profiles', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api', tutorRoutes);
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/questions', questionRoutes);

// Create HTTP server
const server = http.createServer(app);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[SignLoop Server] Listening on http://localhost:${PORT}`);
    console.log(`[SignLoop Server] Health endpoint: http://localhost:${PORT}/api/health`);
  });
}

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[SignLoop Server] Received ${signal}. Closing server and database...`);
  server.close(() => {
    closeDb();
    console.log('[SignLoop Server] Closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
