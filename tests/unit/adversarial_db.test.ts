import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database, { Database as DatabaseInstance } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { runMigrations, resetDb } from '../../src/server/db/migrate';
import { seedDatabase } from '../../src/server/db/seed';
import { getDb, closeDb } from '../../src/server/db/connection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Adversarial Database Foundation Verification', () => {
  const testDbDir = path.resolve(__dirname, '../../.tmp');
  const testDbPath = path.resolve(testDbDir, `vitest_adversarial_${Date.now()}.db`);
  let db: DatabaseInstance;

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    closeDb();
    process.env.DB_PATH = testDbPath;
    db = getDb();
    runMigrations({ dbPath: testDbPath, silent: true });
    seedDatabase({ silent: true });
  });

  afterAll(() => {
    closeDb();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {
      // Ignored
    }
  });

  describe('1. Foreign Key Constraints', () => {
    it('should reject insert into sessions with invalid profile_id', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
          VALUES ('s-invalid', 'nonexistent-prof', 'LEARNING_PRACTICE', 'STUDENT', 'GLOVE', 'LIVE', 'SESSION_ONLY', 'ACTIVE', datetime('now'))
        `).run();
      }).toThrow(/FOREIGN KEY constraint failed/i);
    });

    it('should reject insert into candidates with invalid session_id', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO candidates (candidate_id, session_id, intent_label, policy_route, created_at)
          VALUES ('cand-invalid', 'nonexistent-session', 'HELP', 'CANDIDATE_READY', datetime('now'))
        `).run();
      }).toThrow(/FOREIGN KEY constraint failed/i);
    });

    it('should reject delete of a profile when referenced by existing sessions', () => {
      // Ensure session exists
      db.prepare(`
        INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
        VALUES ('sess-fk-test', 'prof-stu-01', 'LEARNING_PRACTICE', 'STUDENT', 'GLOVE', 'LIVE', 'SESSION_ONLY', 'ACTIVE', datetime('now'))
      `).run();

      expect(() => {
        db.prepare(`DELETE FROM profiles WHERE id = 'prof-stu-01'`).run();
      }).toThrow(/FOREIGN KEY constraint failed/i);
    });
  });

  describe('2. Check Constraints', () => {
    it('should reject invalid role on profiles', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO profiles (id, pseudonymous_code, role, visibility_status, created_at, updated_at)
          VALUES ('prof-bad', 'BAD-ROLE-VT', 'SUPERUSER', 'ACTIVE', datetime('now'), datetime('now'))
        `).run();
      }).toThrow(/CHECK constraint failed/i);
    });

    it('should reject invalid provenance on events', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO events (event_id, event_type, schema_version, occurred_at, received_at, actor, provenance, retention_class, payload_json)
          VALUES ('evt-bad-prov-vt', 'TEST_EVENT', 1, datetime('now'), datetime('now'), 'ACTOR', 'FABRICATED', 'DERIVED_EVENT', '{}')
        `).run();
      }).toThrow(/CHECK constraint failed/i);
    });

    it('should reject unapproved source_class on knowledge_sources', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_sources (source_id, source_class, content, content_type, status, consent_scope, retention_class, created_at, updated_at)
          VALUES ('ks-bad-vt', 'UNVETTED_WEB', 'Content', 'INSTRUCTION', 'APPROVED', 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))
        `).run();
      }).toThrow(/CHECK constraint failed/i);
    });
  });

  describe('3. Events Immutability Triggers', () => {
    const testEvtId = `evt-vitest-immutable-${Date.now()}`;

    beforeAll(() => {
      db.prepare(`
        INSERT INTO events (event_id, event_type, schema_version, occurred_at, received_at, actor, provenance, retention_class, payload_json)
        VALUES (?, 'GESTURE_OBSERVED', 1, datetime('now'), datetime('now'), 'DEVICE', 'LIVE', 'DERIVED_EVENT', '{"original":true}')
      `).run(testEvtId);
    });

    it('should forbid UPDATE on events via trigger', () => {
      expect(() => {
        db.prepare(`UPDATE events SET payload_json = '{"tampered":true}' WHERE event_id = ?`).run(testEvtId);
      }).toThrow(/Violation: events table is append-only. UPDATE operations are forbidden/i);
    });

    it('should forbid DELETE on events via trigger', () => {
      expect(() => {
        db.prepare(`DELETE FROM events WHERE event_id = ?`).run(testEvtId);
      }).toThrow(/Violation: events table is append-only. DELETE operations are forbidden/i);
    });

    it('should forbid batch DELETE on events via trigger', () => {
      expect(() => {
        db.prepare(`DELETE FROM events WHERE 1=1`).run();
      }).toThrow(/Violation: events table is append-only. DELETE operations are forbidden/i);
    });
  });

  describe('4. Migration Idempotency', () => {
    it('should cleanly skip all migrations when executed repeatedly', () => {
      const results1 = runMigrations({ dbPath: testDbPath, silent: true });
      expect(results1.every((r) => !r.applied)).toBe(true);

      const results2 = runMigrations({ dbPath: testDbPath, silent: true });
      expect(results2.every((r) => !r.applied)).toBe(true);
    });
  });

  describe('5. FTS5 Synchronization', () => {
    const syncSourceId = `TNOTE-VT-${Date.now()}`;

    it('should synchronize INSERT and match exact phrase', () => {
      db.prepare(`
        INSERT INTO knowledge_sources (source_id, source_class, profile_id, source_title, content, content_type, status, version, consent_scope, retention_class, created_at, updated_at)
        VALUES (?, 'TEACHER_KNOWLEDGE', 'prof-stu-01', 'Vitest Sync', 'SpecificKeywordAlphaBravo', 'INSTRUCTION', 'APPROVED', 1, 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))
      `).run(syncSourceId);

      const match = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'SpecificKeywordAlphaBravo'`).get() as any;
      expect(match?.source_id).toBe(syncSourceId);
    });

    it('should synchronize UPDATE in FTS5', () => {
      db.prepare(`UPDATE knowledge_sources SET content = 'ReplacedKeywordCharlieDelta' WHERE source_id = ?`).run(syncSourceId);
      const oldMatch = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'SpecificKeywordAlphaBravo'`).get();
      const newMatch = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'ReplacedKeywordCharlieDelta'`).get() as any;
      expect(oldMatch).toBeUndefined();
      expect(newMatch?.source_id).toBe(syncSourceId);
    });

    it('should synchronize DELETE in FTS5', () => {
      db.prepare(`DELETE FROM knowledge_sources WHERE source_id = ?`).run(syncSourceId);
      const match = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'ReplacedKeywordCharlieDelta'`).get();
      expect(match).toBeUndefined();
    });
  });
});
