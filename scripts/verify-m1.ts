import { getDb, closeDb } from '../src/server/db/connection';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyM1() {
  console.log('====================================================');
  console.log('  SIGNLOOP MILESTONE M1 VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  }

  // 1. Phrase Registry Check
  const registryPath = path.resolve(__dirname, '../data/phrase-registry.json');
  assert('data/phrase-registry.json exists on disk', fs.existsSync(registryPath));

  if (fs.existsSync(registryPath)) {
    const raw = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(raw);
    assert('Phrase registry contains exactly 12 intents', registry.entries?.length === 12);

    const requiredIntents = [
      'HELP', 'WATER', 'FOOD', 'PAIN', 'DOCTOR', 'MEDICINE',
      'WASHROOM', 'YES', 'NO', 'REPEAT', 'THANK_YOU', 'NO_SIGN'
    ];
    const presentIntents = registry.entries.map((e: any) => e.intent);
    const hasAllIntents = requiredIntents.every((i) => presentIntents.includes(i));
    assert('Phrase registry maps all 12 canonical intents', hasAllIntents);
  }

  // 2. Database Connection & Pragma Check
  const db = getDb();
  const journalMode = db.pragma('journal_mode', { simple: true });
  const foreignKeys = db.pragma('foreign_keys', { simple: true });
  assert('SQLite PRAGMA journal_mode is WAL', journalMode === 'wal');
  assert('SQLite PRAGMA foreign_keys is ENABLED (1)', foreignKeys === 1);

  // 3. Relational Table Count Check
  const expectedTables = [
    'profiles', 'profile_contexts', 'sessions', 'events', 'quality_checks',
    'candidates', 'human_decisions', 'approved_outputs', 'audio_events',
    'practice_tasks', 'follow_up_cases', 'knowledge_sources', 'retrieval_runs',
    'tutor_responses', 'consent_and_retention'
  ];

  for (const table of expectedTables) {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
      .get(table);
    assert(`Table '${table}' exists in database`, !!row);
  }

  const tableCountRow = db
    .prepare(
      `SELECT count(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knowledge_sources_fts%' AND name != '_migrations'`
    )
    .get() as { count: number };
  assert('Relational table count is exactly 15', tableCountRow.count === 15);

  // 4. Virtual Table Check
  const ftsTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = 'knowledge_sources_fts'`)
    .get();
  assert("Virtual table 'knowledge_sources_fts' exists", !!ftsTable);

  // 5. Triggers Check
  const expectedTriggers = [
    'prevent_events_update',
    'prevent_events_delete',
    'knowledge_sources_ai',
    'knowledge_sources_au',
    'knowledge_sources_ad'
  ];

  for (const trigger of expectedTriggers) {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND name = ?`)
      .get(trigger);
    assert(`Trigger '${trigger}' exists`, !!row);
  }

  // 6. Seed Counts Check
  const profileCount = (db.prepare(`SELECT COUNT(*) as count FROM profiles`).get() as any).count;
  assert('Profiles seed count is 4 (STU-01, STU-02, TRN-01, STAFF-01)', profileCount === 4);

  const contextCount = (db.prepare(`SELECT COUNT(*) as count FROM profile_contexts`).get() as any).count;
  assert('Profile contexts seed count is 5', contextCount === 5);

  const consentCount = (db.prepare(`SELECT COUNT(*) as count FROM consent_and_retention`).get() as any).count;
  assert('Consent records seed count is 5', consentCount === 5);

  const tasksCount = (db.prepare(`SELECT COUNT(*) as count FROM practice_tasks`).get() as any).count;
  assert('Practice tasks seed count is 2', tasksCount === 2);

  const followUpCount = (db.prepare(`SELECT COUNT(*) as count FROM follow_up_cases`).get() as any).count;
  assert('Follow up cases seed count is 1', followUpCount === 1);

  const teacherNotesCount = (
    db
      .prepare(`SELECT COUNT(*) as count FROM knowledge_sources WHERE source_class = 'TEACHER_KNOWLEDGE'`)
      .get() as any
  ).count;
  assert('Teacher notes seed count is 3 (TNOTE-001, TNOTE-002, TNOTE-003)', teacherNotesCount === 3);

  const studentEvidenceCount = (
    db
      .prepare(`SELECT COUNT(*) as count FROM knowledge_sources WHERE source_class = 'STUDENT_EVIDENCE'`)
      .get() as any
  ).count;
  assert('Student evidence seed count is 2 (EVID-001, EVID-002)', studentEvidenceCount === 2);

  const approvedTrainingCount = (
    db
      .prepare(`SELECT COUNT(*) as count FROM knowledge_sources WHERE source_class = 'APPROVED_TRAINING'`)
      .get() as any
  ).count;
  assert('Approved training seed count is 1 (TRAIN-001)', approvedTrainingCount === 1);

  const ftsCount = (
    db.prepare(`SELECT COUNT(*) as count FROM knowledge_sources_fts`).get() as any
  ).count;
  assert('FTS5 virtual table synchronized all 6 knowledge sources', ftsCount === 6);

  // 7. Append-Only Trigger Enforcement Check
  const testEventId = `verify-evt-${Date.now()}`;
  db.prepare(`
    INSERT INTO events (
      event_id, event_type, schema_version, occurred_at, received_at,
      actor, provenance, retention_class, payload_json
    ) VALUES (?, 'DEVICE_READY', 1, datetime('now'), datetime('now'), 'VERIFIER', 'SIMULATED', 'DERIVED_EVENT', '{}')
  `).run(testEventId);

  let updateBlocked = false;
  try {
    db.prepare(`UPDATE events SET payload_json = '{"tampered": true}' WHERE event_id = ?`).run(testEventId);
  } catch (err: any) {
    if (err.message.includes('append-only')) {
      updateBlocked = true;
    }
  }
  assert('UPDATE on events table is strictly blocked by SQLite trigger (SQLITE_ABORT)', updateBlocked);

  let deleteBlocked = false;
  try {
    db.prepare(`DELETE FROM events WHERE event_id = ?`).run(testEventId);
  } catch (err: any) {
    if (err.message.includes('append-only')) {
      deleteBlocked = true;
    }
  }
  assert('DELETE on events table is strictly blocked by SQLite trigger (SQLITE_ABORT)', deleteBlocked);

  // 8. FTS5 Synchronization Lifecycle Check (Insert -> Match -> Delete)
  const testSourceId = `TNOTE-TEST-${Date.now()}`;
  db.prepare(`
    INSERT INTO knowledge_sources (
      source_id, source_class, profile_id, source_title, content, content_type,
      status, version, consent_scope, retention_class, created_at, updated_at
    ) VALUES (?, 'TEACHER_KNOWLEDGE', 'prof-stu-01', 'Test Sync', 'UniqueKeywordTestingFtsSync', 'INSTRUCTION', 'APPROVED', 1, 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))
  `).run(testSourceId);

  const matchRow = db
    .prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'UniqueKeywordTestingFtsSync'`)
    .get() as any;
  assert('FTS5 automatically indexes new knowledge source via AFTER INSERT trigger', matchRow?.source_id === testSourceId);

  db.prepare(`DELETE FROM knowledge_sources WHERE source_id = ?`).run(testSourceId);
  const matchAfterDelete = db
    .prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'UniqueKeywordTestingFtsSync'`)
    .get() as any;
  assert('FTS5 automatically removes deleted source via AFTER DELETE trigger', !matchAfterDelete);

  closeDb();

  console.log('\n====================================================');
  console.log(`  VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

verifyM1().catch((err) => {
  console.error('[FATAL VERIFICATION ERROR]:', err);
  process.exit(1);
});
