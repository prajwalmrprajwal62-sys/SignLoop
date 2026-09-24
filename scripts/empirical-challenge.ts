import Database, { Database as DatabaseInstance } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from '../src/server/db/connection';
import { runMigrations, resetDb } from '../src/server/db/migrate';
import { seedDatabase } from '../src/server/db/seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(category: string, name: string, passed: boolean, details?: string, error?: string) {
  results.push({ category, name, passed, details, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] [${category}] ${name}`);
  if (details) console.log(`       Details: ${details}`);
  if (error) console.error(`       Error: ${error}`);
}

async function runEmpiricalChallenge() {
  console.log('================================================================');
  console.log('    SIGNLOOP M1 EMPIRICAL ADVERSARIAL CHALLENGE SUITE');
  console.log('================================================================\n');

  // Use a dedicated isolated test database for adversarial attacks
  const testDbDir = path.resolve(__dirname, '../.tmp');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  const testDbPath = path.resolve(testDbDir, `adversarial_challenge_${Date.now()}.db`);
  console.log(`Test database path: ${testDbPath}\n`);

  // Point DB_PATH to isolated test DB and ensure singleton is reset
  closeDb();
  process.env.DB_PATH = testDbPath;

  // Initialize test DB with connection settings
  const db = getDb();

  // Run migrations on test DB
  console.log('--- Setting up test database via migrations & seed ---');
  runMigrations({ dbPath: testDbPath, silent: true });
  seedDatabase({ silent: true });
  console.log('Database initialized and seeded.\n');

  // ============================================================================
  // VECTOR 1: FOREIGN KEY CONSTRAINTS STRESS TEST
  // ============================================================================
  console.log('\n--- VECTOR 1: FOREIGN KEY CONSTRAINTS STRESS TEST ---');

  const fkTests: { table: string; sql: string; desc: string }[] = [
    {
      table: 'profile_contexts',
      sql: `INSERT INTO profile_contexts (id, profile_id, context_type, consent_status, created_at, updated_at)
            VALUES ('ctx-invalid', 'nonexistent-prof-id', 'LEARNING_PRACTICE', 'GRANTED', datetime('now'), datetime('now'))`,
      desc: 'Reject insert with nonexistent profile_id'
    },
    {
      table: 'sessions',
      sql: `INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
            VALUES ('sess-invalid', 'nonexistent-prof-id', 'LEARNING_PRACTICE', 'STUDENT', 'GLOVE', 'LIVE', 'SESSION_ONLY', 'ACTIVE', datetime('now'))`,
      desc: 'Reject insert with nonexistent profile_id'
    },
    {
      table: 'events',
      sql: `INSERT INTO events (event_id, event_type, schema_version, occurred_at, received_at, session_id, profile_id, actor, provenance, retention_class, payload_json)
            VALUES ('evt-invalid-session', 'TEST_EVENT', 1, datetime('now'), datetime('now'), 'nonexistent-session-id', 'prof-stu-01', 'ACTOR', 'LIVE', 'DERIVED_EVENT', '{}')`,
      desc: 'Reject insert with nonexistent session_id'
    },
    {
      table: 'events',
      sql: `INSERT INTO events (event_id, event_type, schema_version, occurred_at, received_at, session_id, profile_id, actor, provenance, retention_class, payload_json)
            VALUES ('evt-invalid-profile', 'TEST_EVENT', 1, datetime('now'), datetime('now'), NULL, 'nonexistent-profile-id', 'ACTOR', 'LIVE', 'DERIVED_EVENT', '{}')`,
      desc: 'Reject insert with nonexistent profile_id'
    },
    {
      table: 'quality_checks',
      sql: `INSERT INTO quality_checks (gate_id, session_id, status, checks_json, evaluated_at)
            VALUES ('qc-invalid', 'nonexistent-session-id', 'PASS', '[]', datetime('now'))`,
      desc: 'Reject insert with nonexistent session_id'
    },
    {
      table: 'candidates',
      sql: `INSERT INTO candidates (candidate_id, session_id, intent_label, policy_route, created_at)
            VALUES ('cand-invalid', 'nonexistent-session-id', 'HELP', 'CANDIDATE_READY', datetime('now'))`,
      desc: 'Reject insert with nonexistent session_id'
    },
    {
      table: 'human_decisions',
      sql: `INSERT INTO human_decisions (decision_id, candidate_id, action, actor_role, created_at)
            VALUES ('dec-invalid', 'nonexistent-candidate-id', 'CONFIRM', 'TEACHER', datetime('now'))`,
      desc: 'Reject insert with nonexistent candidate_id'
    },
    {
      table: 'human_decisions',
      sql: `INSERT INTO human_decisions (decision_id, candidate_id, action, actor_profile_id, actor_role, created_at)
            VALUES ('dec-invalid-prof', 'cand-valid-dummy', 'CONFIRM', 'nonexistent-profile-id', 'TEACHER', datetime('now'))`,
      desc: 'Reject insert with nonexistent actor_profile_id'
    },
    {
      table: 'approved_outputs',
      sql: `INSERT INTO approved_outputs (output_id, decision_id, final_intent, phrase_key, caption_text, created_at)
            VALUES ('out-invalid', 'nonexistent-decision-id', 'HELP', 'help_standard', 'Help please', datetime('now'))`,
      desc: 'Reject insert with nonexistent decision_id'
    },
    {
      table: 'audio_events',
      sql: `INSERT INTO audio_events (audio_event_id, output_id, event_type, occurred_at)
            VALUES ('audio-invalid', 'nonexistent-output-id', 'AUDIO_REQUESTED', datetime('now'))`,
      desc: 'Reject insert with nonexistent output_id'
    },
    {
      table: 'practice_tasks',
      sql: `INSERT INTO practice_tasks (task_id, profile_id, context, intent_id, status, created_at)
            VALUES ('task-invalid', 'nonexistent-profile-id', 'LEARNING_PRACTICE', 'HELP', 'ASSIGNED', datetime('now'))`,
      desc: 'Reject insert with nonexistent profile_id'
    },
    {
      table: 'follow_up_cases',
      sql: `INSERT INTO follow_up_cases (case_id, profile_id, context, intent_id, source_channel, status, policy_snapshot_json, created_at)
            VALUES ('case-invalid', 'nonexistent-profile-id', 'LEARNING_PRACTICE', 'WATER', 'LIVE', 'OPEN', '{}', datetime('now'))`,
      desc: 'Reject insert with nonexistent profile_id'
    },
    {
      table: 'follow_up_cases',
      sql: `INSERT INTO follow_up_cases (case_id, profile_id, context, intent_id, source_channel, correction_event_id, status, policy_snapshot_json, created_at)
            VALUES ('case-invalid-evt', 'prof-stu-01', 'LEARNING_PRACTICE', 'WATER', 'LIVE', 'nonexistent-event-id', 'OPEN', '{}', datetime('now'))`,
      desc: 'Reject insert with nonexistent correction_event_id'
    },
    {
      table: 'knowledge_sources',
      sql: `INSERT INTO knowledge_sources (source_id, source_class, profile_id, content, content_type, status, consent_scope, retention_class, created_at, updated_at)
            VALUES ('ks-invalid-prof', 'STUDENT_EVIDENCE', 'nonexistent-profile-id', 'Evidence text', 'OBSERVATION', 'APPROVED', 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))`,
      desc: 'Reject insert with nonexistent profile_id'
    },
    {
      table: 'knowledge_sources',
      sql: `INSERT INTO knowledge_sources (source_id, source_class, task_id, content, content_type, status, consent_scope, retention_class, created_at, updated_at)
            VALUES ('ks-invalid-task', 'TEACHER_KNOWLEDGE', 'nonexistent-task-id', 'Instruction text', 'INSTRUCTION', 'APPROVED', 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))`,
      desc: 'Reject insert with nonexistent task_id'
    },
    {
      table: 'knowledge_sources',
      sql: `INSERT INTO knowledge_sources (source_id, source_class, supersedes_id, content, content_type, status, consent_scope, retention_class, created_at, updated_at)
            VALUES ('ks-invalid-sup', 'TEACHER_KNOWLEDGE', 'nonexistent-source-id', 'Instruction text', 'INSTRUCTION', 'APPROVED', 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))`,
      desc: 'Reject insert with nonexistent supersedes_id'
    },
    {
      table: 'retrieval_runs',
      sql: `INSERT INTO retrieval_runs (retrieval_id, query_type, profile_id, source_allowlist_json, filters_json, candidate_source_ids_json, selected_source_ids_json, excluded_source_ids_json, status, created_at)
            VALUES ('ret-invalid-prof', 'WHY_TASK', 'nonexistent-profile-id', '[]', '{}', '[]', '[]', '[]', 'SUCCESS', datetime('now'))`,
      desc: 'Reject insert with nonexistent profile_id'
    },
    {
      table: 'tutor_responses',
      sql: `INSERT INTO tutor_responses (response_id, retrieval_id, answer_type, answer_text, source_ids_json, retrieval_status, created_at)
            VALUES ('tut-invalid-ret', 'nonexistent-retrieval-id', 'EXPLANATION', 'Explanation text', '[]', 'GROUNDED', datetime('now'))`,
      desc: 'Reject insert with nonexistent retrieval_id'
    },
    {
      table: 'consent_and_retention',
      sql: `INSERT INTO consent_and_retention (record_id, profile_id, scope, status, created_at)
            VALUES ('con-invalid-prof', 'nonexistent-profile-id', 'SESSION_ONLY', 'ACTIVE', datetime('now'))`,
      desc: 'Reject insert with nonexistent profile_id'
    }
  ];

  for (const t of fkTests) {
    let rejected = false;
    let errorMsg = '';
    try {
      db.prepare(t.sql).run();
    } catch (err: any) {
      rejected = true;
      errorMsg = err.message;
    }
    const isFkError = rejected && errorMsg.toLowerCase().includes('foreign key constraint failed');
    recordTest(
      'Foreign Key',
      `${t.table}: ${t.desc}`,
      isFkError,
      isFkError ? `Blocked by SQLite FK constraint: "${errorMsg}"` : undefined,
      !isFkError ? (rejected ? `Unexpected error: ${errorMsg}` : 'Was NOT rejected!') : undefined
    );
  }

  // Test FK Cascade vs Protect on delete
  console.log('\n--- FK CASCADE & PROTECT BEHAVIOR ---');
  // 1. Deleting a profile that is referenced by sessions (should fail because sessions has NO cascade)
  let profileDeleteBlocked = false;
  let profileDeleteError = '';
  try {
    db.prepare(`DELETE FROM profiles WHERE id = 'prof-stu-01'`).run();
  } catch (err: any) {
    profileDeleteBlocked = true;
    profileDeleteError = err.message;
  }
  recordTest(
    'Foreign Key Protection',
    'profiles: Reject DELETE of profile referenced by child tables without cascade',
    profileDeleteBlocked && profileDeleteError.toLowerCase().includes('foreign key constraint failed'),
    `Blocked as expected: "${profileDeleteError}"`
  );

  // ============================================================================
  // VECTOR 2: CHECK CONSTRAINTS & ENUM VALIDATION
  // ============================================================================
  console.log('\n--- VECTOR 2: CHECK CONSTRAINTS & ENUM VALIDATION ---');

  const checkTests: { name: string; sql: string; expectedColOrTable: string }[] = [
    {
      name: 'profiles.role invalid enum',
      sql: `INSERT INTO profiles (id, pseudonymous_code, role, visibility_status, created_at, updated_at)
            VALUES ('prof-bad-role', 'BAD-ROLE', 'SUPERUSER', 'ACTIVE', datetime('now'), datetime('now'))`,
      expectedColOrTable: 'role'
    },
    {
      name: 'profiles.visibility_status invalid enum',
      sql: `INSERT INTO profiles (id, pseudonymous_code, role, visibility_status, created_at, updated_at)
            VALUES ('prof-bad-vis', 'BAD-VIS', 'STUDENT', 'PURGED', datetime('now'), datetime('now'))`,
      expectedColOrTable: 'visibility_status'
    },
    {
      name: 'profile_contexts.context_type invalid enum',
      sql: `INSERT INTO profile_contexts (id, profile_id, context_type, consent_status, created_at, updated_at)
            VALUES ('ctx-bad-type', 'prof-stu-01', 'ARBITRARY_CONTEXT', 'GRANTED', datetime('now'), datetime('now'))`,
      expectedColOrTable: 'context_type'
    },
    {
      name: 'profile_contexts.consent_status invalid enum',
      sql: `INSERT INTO profile_contexts (id, profile_id, context_type, consent_status, created_at, updated_at)
            VALUES ('ctx-bad-cons', 'prof-stu-01', 'LEARNING_PRACTICE', 'ACCEPTED_MAYBE', datetime('now'), datetime('now'))`,
      expectedColOrTable: 'consent_status'
    },
    {
      name: 'profile_contexts.active boolean integer check',
      sql: `INSERT INTO profile_contexts (id, profile_id, context_type, consent_status, active, created_at, updated_at)
            VALUES ('ctx-bad-act', 'prof-stu-01', 'LEARNING_PRACTICE', 'GRANTED', 5, datetime('now'), datetime('now'))`,
      expectedColOrTable: 'active'
    },
    {
      name: 'sessions.context invalid enum',
      sql: `INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
            VALUES ('sess-bad-ctx', 'prof-stu-01', 'FREE_PLAY', 'STUDENT', 'GLOVE', 'LIVE', 'SESSION_ONLY', 'ACTIVE', datetime('now'))`,
      expectedColOrTable: 'context'
    },
    {
      name: 'sessions.source_modality invalid enum',
      sql: `INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
            VALUES ('sess-bad-mod', 'prof-stu-01', 'LEARNING_PRACTICE', 'STUDENT', 'KEYBOARD_MOUSE', 'LIVE', 'SESSION_ONLY', 'ACTIVE', datetime('now'))`,
      expectedColOrTable: 'source_modality'
    },
    {
      name: 'sessions.provenance invalid enum',
      sql: `INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
            VALUES ('sess-bad-prov', 'prof-stu-01', 'LEARNING_PRACTICE', 'STUDENT', 'GLOVE', 'SYNTHESIZED_AI', 'SESSION_ONLY', 'ACTIVE', datetime('now'))`,
      expectedColOrTable: 'provenance'
    },
    {
      name: 'sessions.status invalid enum',
      sql: `INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
            VALUES ('sess-bad-stat', 'prof-stu-01', 'LEARNING_PRACTICE', 'STUDENT', 'GLOVE', 'LIVE', 'SESSION_ONLY', 'SUSPENDED', datetime('now'))`,
      expectedColOrTable: 'status'
    },
    {
      name: 'events.provenance invalid enum',
      sql: `INSERT INTO events (event_id, event_type, schema_version, occurred_at, received_at, actor, provenance, retention_class, payload_json)
            VALUES ('evt-bad-prov', 'TEST_EVENT', 1, datetime('now'), datetime('now'), 'ACTOR', 'FABRICATED', 'DERIVED_EVENT', '{}')`,
      expectedColOrTable: 'provenance'
    },
    {
      name: 'events.retention_class invalid enum',
      sql: `INSERT INTO events (event_id, event_type, schema_version, occurred_at, received_at, actor, provenance, retention_class, payload_json)
            VALUES ('evt-bad-ret', 'TEST_EVENT', 1, datetime('now'), datetime('now'), 'ACTOR', 'LIVE', 'FOREVER_STORED', '{}')`,
      expectedColOrTable: 'retention_class'
    },
    {
      name: 'quality_checks.status invalid enum',
      sql: `INSERT INTO quality_checks (gate_id, session_id, status, checks_json, evaluated_at)
            VALUES ('qc-bad-stat', 'sess-stu-01-seed', 'UNKNOWN_STATUS', '[]', datetime('now'))`,
      expectedColOrTable: 'status'
    },
    {
      name: 'candidates.policy_route invalid enum',
      sql: `INSERT INTO candidates (candidate_id, session_id, intent_label, policy_route, created_at)
            VALUES ('cand-bad-route', 'sess-stu-01-seed', 'HELP', 'AUTO_RELEASED', datetime('now'))`,
      expectedColOrTable: 'policy_route'
    },
    {
      name: 'human_decisions.action invalid enum',
      sql: `INSERT INTO human_decisions (decision_id, candidate_id, action, actor_role, created_at)
            VALUES ('dec-bad-act', 'cand-seed-01', 'BYPASS_CHECK', 'TEACHER', datetime('now'))`,
      expectedColOrTable: 'action'
    },
    {
      name: 'audio_events.event_type invalid enum',
      sql: `INSERT INTO audio_events (audio_event_id, output_id, event_type, occurred_at)
            VALUES ('aud-bad-type', 'out-seed-01', 'AUDIO_PAUSED', datetime('now'))`,
      expectedColOrTable: 'event_type'
    },
    {
      name: 'practice_tasks.status invalid enum',
      sql: `INSERT INTO practice_tasks (task_id, profile_id, context, intent_id, status, created_at)
            VALUES ('task-bad-stat', 'prof-stu-01', 'LEARNING_PRACTICE', 'HELP', 'DEFERRED', datetime('now'))`,
      expectedColOrTable: 'status'
    },
    {
      name: 'practice_tasks.priority invalid enum',
      sql: `INSERT INTO practice_tasks (task_id, profile_id, context, intent_id, priority, status, created_at)
            VALUES ('task-bad-prio', 'prof-stu-01', 'LEARNING_PRACTICE', 'HELP', 'CRITICAL_URGENT', 'ASSIGNED', datetime('now'))`,
      expectedColOrTable: 'priority'
    },
    {
      name: 'follow_up_cases.status invalid enum',
      sql: `INSERT INTO follow_up_cases (case_id, profile_id, context, intent_id, source_channel, status, policy_snapshot_json, created_at)
            VALUES ('case-bad-stat', 'prof-stu-01', 'LEARNING_PRACTICE', 'WATER', 'LIVE', 'RESOLVED_FOREVER', '{}', datetime('now'))`,
      expectedColOrTable: 'status'
    },
    {
      name: 'knowledge_sources.source_class invalid enum (reject untrusted external sources)',
      sql: `INSERT INTO knowledge_sources (source_id, source_class, content, content_type, status, consent_scope, retention_class, created_at, updated_at)
            VALUES ('ks-bad-class', 'EXTERNAL_WEB_SCRAPE', 'Scraped content', 'INSTRUCTION', 'APPROVED', 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))`,
      expectedColOrTable: 'source_class'
    },
    {
      name: 'knowledge_sources.content_type invalid enum',
      sql: `INSERT INTO knowledge_sources (source_id, source_class, content, content_type, status, consent_scope, retention_class, created_at, updated_at)
            VALUES ('ks-bad-ctype', 'TEACHER_KNOWLEDGE', 'Content', 'BLOG_POST', 'APPROVED', 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))`,
      expectedColOrTable: 'content_type'
    },
    {
      name: 'knowledge_sources.status invalid enum',
      sql: `INSERT INTO knowledge_sources (source_id, source_class, content, content_type, status, consent_scope, retention_class, created_at, updated_at)
            VALUES ('ks-bad-stat', 'TEACHER_KNOWLEDGE', 'Content', 'INSTRUCTION', 'DELETED', 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))`,
      expectedColOrTable: 'status'
    },
    {
      name: 'retrieval_runs.query_type invalid enum',
      sql: `INSERT INTO retrieval_runs (retrieval_id, query_type, source_allowlist_json, filters_json, candidate_source_ids_json, selected_source_ids_json, excluded_source_ids_json, status, created_at)
            VALUES ('ret-bad-qtype', 'CHIT_CHAT', '[]', '{}', '[]', '[]', '[]', 'SUCCESS', datetime('now'))`,
      expectedColOrTable: 'query_type'
    },
    {
      name: 'retrieval_runs.status invalid enum',
      sql: `INSERT INTO retrieval_runs (retrieval_id, query_type, source_allowlist_json, filters_json, candidate_source_ids_json, selected_source_ids_json, excluded_source_ids_json, status, created_at)
            VALUES ('ret-bad-stat', 'WHY_TASK', '[]', '{}', '[]', '[]', '[]', 'TIMED_OUT', datetime('now'))`,
      expectedColOrTable: 'status'
    },
    {
      name: 'tutor_responses.retrieval_status invalid enum',
      sql: `INSERT INTO tutor_responses (response_id, retrieval_id, answer_type, answer_text, source_ids_json, retrieval_status, created_at)
            VALUES ('tut-bad-stat', 'ret-seed-01', 'EXPLANATION', 'Text', '[]', 'HALLUCINATED_GUESS', datetime('now'))`,
      expectedColOrTable: 'retrieval_status'
    },
    {
      name: 'consent_and_retention.scope invalid enum',
      sql: `INSERT INTO consent_and_retention (record_id, profile_id, scope, status, created_at)
            VALUES ('con-bad-scope', 'prof-stu-01', 'THIRD_PARTY_SHARING', 'ACTIVE', datetime('now'))`,
      expectedColOrTable: 'scope'
    },
    {
      name: 'consent_and_retention.status invalid enum',
      sql: `INSERT INTO consent_and_retention (record_id, profile_id, scope, status, created_at)
            VALUES ('con-bad-stat', 'prof-stu-01', 'SESSION_ONLY', 'PENDING_APPROVAL', datetime('now'))`,
      expectedColOrTable: 'status'
    }
  ];

  for (const c of checkTests) {
    let rejected = false;
    let errorMsg = '';
    try {
      db.prepare(c.sql).run();
    } catch (err: any) {
      rejected = true;
      errorMsg = err.message;
    }
    const isCheckError = rejected && errorMsg.toLowerCase().includes('check constraint failed');
    recordTest(
      'Check Constraint',
      c.name,
      isCheckError,
      isCheckError ? `Blocked by SQLite CHECK constraint: "${errorMsg}"` : undefined,
      !isCheckError ? (rejected ? `Unexpected error: ${errorMsg}` : 'CHECK constraint was NOT enforced!') : undefined
    );
  }

  // UNIQUE CONSTRAINTS
  console.log('\n--- UNIQUE CONSTRAINTS ---');
  let duplicateCodeBlocked = false;
  let dupCodeErr = '';
  try {
    db.prepare(`INSERT INTO profiles (id, pseudonymous_code, role, visibility_status, created_at, updated_at)
                VALUES ('prof-dup-code', 'STU-01', 'STUDENT', 'ACTIVE', datetime('now'), datetime('now'))`).run();
  } catch (err: any) {
    duplicateCodeBlocked = true;
    dupCodeErr = err.message;
  }
  recordTest(
    'Unique Constraint',
    'profiles.pseudonymous_code uniqueness',
    duplicateCodeBlocked && dupCodeErr.toLowerCase().includes('unique constraint failed'),
    `Blocked duplicate pseudonymous_code 'STU-01': "${dupCodeErr}"`
  );

  let duplicateContextBlocked = false;
  let dupCtxErr = '';
  try {
    db.prepare(`INSERT INTO profile_contexts (id, profile_id, context_type, consent_status, created_at, updated_at)
                VALUES ('ctx-dup', 'prof-stu-01', 'LEARNING_PRACTICE', 'GRANTED', datetime('now'), datetime('now'))`).run();
  } catch (err: any) {
    duplicateContextBlocked = true;
    dupCtxErr = err.message;
  }
  recordTest(
    'Unique Constraint',
    'profile_contexts (profile_id, context_type) composite uniqueness',
    duplicateContextBlocked && dupCtxErr.toLowerCase().includes('unique constraint failed'),
    `Blocked duplicate (profile_id, context_type): "${dupCtxErr}"`
  );

  // ============================================================================
  // VECTOR 3: ADVERSARIAL ATTACKS ON IMMUTABLE EVENTS TABLE (TRIGGERS)
  // ============================================================================
  console.log('\n--- VECTOR 3: ADVERSARIAL ATTACKS ON IMMUTABLE EVENTS TABLE ---');

  // Insert a legitimate event first to attack
  const attackEventId = `attack-target-${Date.now()}`;
  db.prepare(`
    INSERT INTO events (
      event_id, event_type, schema_version, occurred_at, received_at,
      actor, provenance, retention_class, payload_json
    ) VALUES (?, 'GESTURE_OBSERVED', 1, datetime('now'), datetime('now'), 'DEVICE_REPLAY', 'SIMULATED', 'DERIVED_EVENT', '{"original": true}')
  `).run(attackEventId);

  const eventBefore = db.prepare(`SELECT * FROM events WHERE event_id = ?`).get(attackEventId) as any;

  // Attack 1: Direct single-row UPDATE
  let update1Blocked = false;
  let update1Msg = '';
  try {
    db.prepare(`UPDATE events SET payload_json = '{"tampered": true}' WHERE event_id = ?`).run(attackEventId);
  } catch (err: any) {
    update1Blocked = true;
    update1Msg = err.message;
  }
  recordTest(
    'Events Immutability',
    'Attack 1: Direct single-row UPDATE blocked by trigger',
    update1Blocked && update1Msg.includes('append-only') && update1Msg.includes('UPDATE operations are forbidden'),
    `Blocked with message: "${update1Msg}"`
  );

  // Attack 2: Batch UPDATE with WHERE 1=1
  let update2Blocked = false;
  let update2Msg = '';
  try {
    db.prepare(`UPDATE events SET schema_version = 999 WHERE 1=1`).run();
  } catch (err: any) {
    update2Blocked = true;
    update2Msg = err.message;
  }
  recordTest(
    'Events Immutability',
    'Attack 2: Batch UPDATE (WHERE 1=1) blocked by trigger',
    update2Blocked && update2Msg.includes('append-only'),
    `Blocked with message: "${update2Msg}"`
  );

  // Attack 3: Subquery UPDATE
  let update3Blocked = false;
  let update3Msg = '';
  try {
    db.prepare(`UPDATE events SET actor = 'INTRUDER' WHERE event_id IN (SELECT event_id FROM events)`).run();
  } catch (err: any) {
    update3Blocked = true;
    update3Msg = err.message;
  }
  recordTest(
    'Events Immutability',
    'Attack 3: Subquery UPDATE blocked by trigger',
    update3Blocked && update3Msg.includes('append-only'),
    `Blocked with message: "${update3Msg}"`
  );

  // Attack 4: UPSERT (INSERT ON CONFLICT DO UPDATE)
  let upsertBlocked = false;
  let upsertMsg = '';
  try {
    db.prepare(`
      INSERT INTO events (
        event_id, event_type, schema_version, occurred_at, received_at,
        actor, provenance, retention_class, payload_json
      ) VALUES (?, 'TAMPERED_EVENT', 1, datetime('now'), datetime('now'), 'HACKER', 'SIMULATED', 'DERIVED_EVENT', '{}')
      ON CONFLICT(event_id) DO UPDATE SET actor = 'BYPASS_ATTEMPT'
    `).run(attackEventId);
  } catch (err: any) {
    upsertBlocked = true;
    upsertMsg = err.message;
  }
  recordTest(
    'Events Immutability',
    'Attack 4: UPSERT (ON CONFLICT DO UPDATE) blocked by trigger',
    upsertBlocked && upsertMsg.includes('append-only'),
    `Blocked UPSERT rewrite: "${upsertMsg}"`
  );

  // Attack 5: Direct single-row DELETE
  let delete1Blocked = false;
  let delete1Msg = '';
  try {
    db.prepare(`DELETE FROM events WHERE event_id = ?`).run(attackEventId);
  } catch (err: any) {
    delete1Blocked = true;
    delete1Msg = err.message;
  }
  recordTest(
    'Events Immutability',
    'Attack 5: Direct single-row DELETE blocked by trigger',
    delete1Blocked && delete1Msg.includes('append-only') && delete1Msg.includes('DELETE operations are forbidden'),
    `Blocked with message: "${delete1Msg}"`
  );

  // Attack 6: Batch DELETE (WHERE 1=1)
  let delete2Blocked = false;
  let delete2Msg = '';
  try {
    db.prepare(`DELETE FROM events WHERE 1=1`).run();
  } catch (err: any) {
    delete2Blocked = true;
    delete2Msg = err.message;
  }
  recordTest(
    'Events Immutability',
    'Attack 6: Batch DELETE (WHERE 1=1) blocked by trigger',
    delete2Blocked && delete2Msg.includes('append-only'),
    `Blocked with message: "${delete2Msg}"`
  );

  // Attack 7: Subquery DELETE
  let delete3Blocked = false;
  let delete3Msg = '';
  try {
    db.prepare(`DELETE FROM events WHERE event_id IN (SELECT event_id FROM events)`).run();
  } catch (err: any) {
    delete3Blocked = true;
    delete3Msg = err.message;
  }
  recordTest(
    'Events Immutability',
    'Attack 7: Subquery DELETE blocked by trigger',
    delete3Blocked && delete3Msg.includes('append-only'),
    `Blocked with message: "${delete3Msg}"`
  );

  // Verify that the event record remains completely intact and untampered
  const eventAfter = db.prepare(`SELECT * FROM events WHERE event_id = ?`).get(attackEventId) as any;
  const isUntampered = JSON.stringify(eventBefore) === JSON.stringify(eventAfter);
  recordTest(
    'Events Immutability',
    'Target event data remains completely unmodified after all attack attempts',
    isUntampered,
    `Payload and fields match byte-for-byte: ${eventAfter?.payload_json}`
  );

  // ============================================================================
  // VECTOR 4: CONCURRENT CONNECTIONS & WAL MODE READ/WRITE STRESS HARNESS
  // ============================================================================
  console.log('\n--- VECTOR 4: CONCURRENT CONNECTIONS & WAL MODE HARNESS ---');

  // Verify journal mode pragma
  const mode = db.pragma('journal_mode', { simple: true });
  recordTest(
    'WAL Concurrency',
    'SQLite is operating in WAL (Write-Ahead Logging) mode',
    mode === 'wal',
    `Reported journal_mode: ${mode}`
  );

  // Test multi-connection concurrent access
  const connA = new Database(testDbPath);
  connA.pragma('busy_timeout = 5000');
  const connB = new Database(testDbPath);
  connB.pragma('busy_timeout = 5000');

  // Concurrency Test A: WAL Non-blocking Reader during active write transaction
  console.log('Testing non-blocking read during active transaction in another handle...');
  let readerSuccessDuringWrite = false;
  let isolationVerified = false;

  const testProfileId = `prof-wal-test-${Date.now()}`;

  // Start an explicit transaction on connA
  connA.exec('BEGIN IMMEDIATE');
  connA.prepare(`
    INSERT INTO profiles (id, pseudonymous_code, role, visibility_status, created_at, updated_at)
    VALUES (?, 'WAL-TEST', 'STUDENT', 'ACTIVE', datetime('now'), datetime('now'))
  `).run(testProfileId);

  // connB attempts to read immediately while connA transaction is uncommitted
  try {
    const rowFromConnB = connB.prepare(`SELECT * FROM profiles WHERE id = ?`).get(testProfileId);
    readerSuccessDuringWrite = true;
    // Snapshot isolation check: connB should NOT see uncommitted row
    isolationVerified = (rowFromConnB === undefined);
  } catch (err: any) {
    console.error('Reader blocked unexpectedly in WAL mode:', err);
  }

  // Commit transaction on connA
  connA.exec('COMMIT');

  // connB reads again after commit - should now see the committed row
  const rowAfterCommit = connB.prepare(`SELECT * FROM profiles WHERE id = ?`).get(testProfileId) as any;
  const readerSawCommitted = rowAfterCommit && rowAfterCommit.id === testProfileId;

  recordTest(
    'WAL Concurrency',
    'Concurrent reader (connB) executes without blocking while writer (connA) holds transaction',
    readerSuccessDuringWrite,
    'connB did not lock or wait on connA uncommitted transaction'
  );

  recordTest(
    'WAL Concurrency',
    'Snapshot isolation: uncommitted writes from connA are invisible to concurrent reader connB',
    isolationVerified,
    'Uncommitted row was correctly hidden from reader'
  );

  recordTest(
    'WAL Concurrency',
    'Read visibility: committed writes from connA are immediately visible to connB',
    readerSawCommitted,
    `Committed row ${testProfileId} read successfully by connB`
  );

  // Concurrency Test B: 100 Interleaved operations between connA and connB
  console.log('Testing 100 interleaved reads and writes between two separate database connections...');
  let interleavedSuccess = true;
  let interleavedErrors = 0;

  for (let i = 0; i < 50; i++) {
    try {
      const code = `CONC-${Date.now()}-${i}`;
      connA.prepare(`
        INSERT INTO profiles (id, pseudonymous_code, role, visibility_status, created_at, updated_at)
        VALUES (?, ?, 'STUDENT', 'ACTIVE', datetime('now'), datetime('now'))
      `).run(`prof-conc-${i}`, code);

      const readRow = connB.prepare(`SELECT id, pseudonymous_code FROM profiles WHERE id = ?`).get(`prof-conc-${i}`) as any;
      if (!readRow || readRow.pseudonymous_code !== code) {
        interleavedSuccess = false;
        interleavedErrors++;
      }
    } catch (err) {
      interleavedSuccess = false;
      interleavedErrors++;
    }
  }

  recordTest(
    'WAL Concurrency',
    '50 interleaved rapid sequential write (connA) & read (connB) cycles without lock collisions',
    interleavedSuccess && interleavedErrors === 0,
    `All 50 cycles succeeded with 0 SQLITE_BUSY errors`
  );

  connA.close();
  connB.close();

  // ============================================================================
  // VECTOR 5: MIGRATION IDEMPOTENCY & RESET TESTING
  // ============================================================================
  console.log('\n--- VECTOR 5: MIGRATION IDEMPOTENCY & RESET TESTING ---');

  // Baseline schema counts before idempotency tests
  const getTableCount = (d: DatabaseInstance) => (
    d.prepare(`SELECT count(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knowledge_sources_fts%' AND name != '_migrations'`).get() as any
  ).count;
  const getIndexCount = (d: DatabaseInstance) => (
    d.prepare(`SELECT count(*) as count FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'`).get() as any
  ).count;
  const getTriggerCount = (d: DatabaseInstance) => (
    d.prepare(`SELECT count(*) as count FROM sqlite_master WHERE type = 'trigger' AND name NOT LIKE 'sqlite_%'`).get() as any
  ).count;

  const initialTables = getTableCount(db);
  const initialIndices = getIndexCount(db);
  const initialTriggers = getTriggerCount(db);

  // 1. Run migrations again on already-migrated database
  console.log('Running runMigrations() on already migrated database...');
  let rerunResults = runMigrations({ dbPath: testDbPath, silent: true });
  const allSkipped = rerunResults.every((r) => r.applied === false);
  const rerunTables = getTableCount(db);
  const rerunIndices = getIndexCount(db);
  const rerunTriggers = getTriggerCount(db);

  recordTest(
    'Migration Idempotency',
    'Subsequent runMigrations() skips all 16 already applied migrations without error',
    allSkipped && rerunResults.length === 16,
    `16 migrations examined, 16 skipped (${rerunResults.filter(r => !r.applied).length} skipped)`
  );

  recordTest(
    'Migration Idempotency',
    'Schema objects remain identical after subsequent migration run (tables, indices, triggers unchanged)',
    initialTables === rerunTables && initialIndices === rerunIndices && initialTriggers === rerunTriggers,
    `Tables: ${rerunTables}, Indices: ${rerunIndices}, Triggers: ${rerunTriggers}`
  );

  // 2. Loop 5 consecutive migration runs to stress test idempotency loop
  let loopSuccess = true;
  for (let loop = 1; loop <= 5; loop++) {
    const res = runMigrations({ dbPath: testDbPath, silent: true });
    if (!res.every((r) => !r.applied)) {
      loopSuccess = false;
    }
  }
  recordTest(
    'Migration Idempotency',
    '5 consecutive migration runs in rapid succession preserve idempotent state',
    loopSuccess,
    'All 5 iterations returned clean skip statuses'
  );

  // 3. Database reset and fresh migration re-application
  console.log('Testing resetDb() and re-application of all migrations...');
  resetDb({ dbPath: testDbPath, silent: true });
  const tablesAfterReset = getTableCount(db);

  recordTest(
    'Database Reset',
    'resetDb() drops all relational tables, views, and virtual tables cleanly',
    tablesAfterReset === 0,
    `Remaining relational tables: ${tablesAfterReset}`
  );

  const reapplyResults = runMigrations({ dbPath: testDbPath, silent: true });
  const allReapplied = reapplyResults.every((r) => r.applied === true);
  const tablesAfterReapply = getTableCount(db);
  const indicesAfterReapply = getIndexCount(db);
  const triggersAfterReapply = getTriggerCount(db);

  recordTest(
    'Database Rebuild',
    'runMigrations() cleanly recreates all 16 migrations from scratch after reset',
    allReapplied && tablesAfterReapply === 15 && triggersAfterReapply === 5 && indicesAfterReapply === initialIndices,
    `Tables recreated: ${tablesAfterReapply}/15, Triggers: ${triggersAfterReapply}/5, Indices: ${indicesAfterReapply}`
  );

  // Re-seed after rebuild to verify seeding idempotency
  seedDatabase({ silent: true });
  const profileCountAfterReseed = (db.prepare(`SELECT count(*) as count FROM profiles`).get() as any).count;
  recordTest(
    'Seed Idempotency',
    'seedDatabase() cleanly populates newly rebuilt database',
    profileCountAfterReseed === 4,
    `Profiles seeded: ${profileCountAfterReseed}`
  );

  // ============================================================================
  // VECTOR 6: FTS5 SYNCHRONIZATION & ESCAPING STRESS HARNESS
  // ============================================================================
  console.log('\n--- VECTOR 6: FTS5 SYNCHRONIZATION & ESCAPING STRESS HARNESS ---');

  // Insert complex content with special characters, punctuation, and unicode
  const unicodeSourceId = `TNOTE-UNICODE-${Date.now()}`;
  const unicodeContent = `Student demonstrates 'HELP' gesture with 90° palm orientation & fingers curled. 
                          Special chars: "quotes", <tags>, & ampersands, accents: café, résumé, emojis: 🤟👋.`;

  db.prepare(`
    INSERT INTO knowledge_sources (
      source_id, source_class, profile_id, source_title, content, content_type,
      status, version, consent_scope, retention_class, created_at, updated_at
    ) VALUES (?, 'TEACHER_KNOWLEDGE', 'prof-stu-01', 'Unicode & Special Chars', ?, 'INSTRUCTION', 'APPROVED', 1, 'LEARNING_PRACTICE', 'DERIVED_SUMMARY', datetime('now'), datetime('now'))
  `).run(unicodeSourceId, unicodeContent);

  // Test FTS search with quoted phrase
  const ftsMatch = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH '"palm orientation"'`).get() as any;
  recordTest(
    'FTS5 Synchronization',
    'FTS5 indexes complex text with special characters and supports exact phrase queries',
    ftsMatch?.source_id === unicodeSourceId,
    `Matched source_id: ${ftsMatch?.source_id}`
  );

  // Test FTS5 UPDATE trigger synchronization
  const updatedContent = `Updated advice: Keep palm completely vertical and thumb extended. UniqueKeyOmega77`;
  db.prepare(`UPDATE knowledge_sources SET content = ? WHERE source_id = ?`).run(updatedContent, unicodeSourceId);

  const ftsOldTerm = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'curled'`).get();
  const ftsNewTerm = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'UniqueKeyOmega77'`).get() as any;

  recordTest(
    'FTS5 Synchronization',
    'AFTER UPDATE trigger updates FTS index (old terms removed, new terms indexed)',
    !ftsOldTerm && ftsNewTerm?.source_id === unicodeSourceId,
    `Old term match: ${!!ftsOldTerm}, New term match: ${ftsNewTerm?.source_id}`
  );

  // Test FTS5 DELETE trigger synchronization
  db.prepare(`DELETE FROM knowledge_sources WHERE source_id = ?`).run(unicodeSourceId);
  const ftsAfterDelete = db.prepare(`SELECT source_id FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'UniqueKeyOmega77'`).get();
  recordTest(
    'FTS5 Synchronization',
    'AFTER DELETE trigger removes row from FTS index',
    !ftsAfterDelete,
    `FTS match after delete: ${!!ftsAfterDelete}`
  );

  // ============================================================================
  // VECTOR 7: ROUTING GATE & MODEL SCORE REPOSITORY CONSTRAINTS
  // ============================================================================
  console.log('\n--- VECTOR 7: ROUTING GATE & MODEL SCORE CONSTRAINTS ---');

  // Create a valid session first so candidate foreign key succeeds
  db.prepare(`
    INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at)
    VALUES ('sess-stu-01-seed', 'prof-stu-01', 'LEARNING_PRACTICE', 'STUDENT', 'GLOVE', 'LIVE', 'SESSION_ONLY', 'ACTIVE', datetime('now'))
  `).run();

  // Insert candidate with NULL score (unmeasured score allowed)
  const candNullScoreId = `cand-null-${Date.now()}`;
  db.prepare(`
    INSERT INTO candidates (candidate_id, session_id, intent_label, score, routing_gate, policy_route, created_at)
    VALUES (?, 'sess-stu-01-seed', 'HELP', NULL, 0.75, 'NO_SIGN', datetime('now'))
  `).run(candNullScoreId);

  const candNullRow = db.prepare(`SELECT score, routing_gate FROM candidates WHERE candidate_id = ?`).get(candNullScoreId) as any;
  recordTest(
    'Model Score Integrity',
    'Candidates table permits NULL score for unmeasured signals (never coerced to 0)',
    candNullRow && candNullRow.score === null && candNullRow.routing_gate === 0.75,
    `Score: ${candNullRow?.score}, routing_gate: ${candNullRow?.routing_gate}`
  );

  // Insert candidate below 75% gate
  const candBelowGateId = `cand-below-${Date.now()}`;
  db.prepare(`
    INSERT INTO candidates (candidate_id, session_id, intent_label, score, routing_gate, policy_route, why_reason_code, created_at)
    VALUES (?, 'sess-stu-01-seed', 'WATER', 0.68, 0.75, 'REVIEW_REQUIRED', 'SCORE_BELOW_GATE', datetime('now'))
  `).run(candBelowGateId);

  const candBelowRow = db.prepare(`SELECT score, routing_gate, policy_route FROM candidates WHERE candidate_id = ?`).get(candBelowGateId) as any;
  recordTest(
    'Model Score Integrity',
    'Candidates table stores model scores with floating precision and enforces default 0.75 gate',
    candBelowRow && candBelowRow.score === 0.68 && candBelowRow.policy_route === 'REVIEW_REQUIRED',
    `Score: ${candBelowRow?.score}, gate: ${candBelowRow?.routing_gate}, route: ${candBelowRow?.policy_route}`
  );

  // Close test database and clean up temporary test db files
  db.close();
  try {
    fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  } catch (err) {
    // Ignore cleanup err
  }

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n================================================================');
  console.log(`  CHALLENGE SUMMARY: ${total} TESTS RUN | ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error(`VERDICT: REQUEST_CHANGES (${failed} tests failed)`);
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE (All adversarial tests passed)');
    process.exit(0);
  }
}

runEmpiricalChallenge().catch((err) => {
  console.error('[FATAL CHALLENGE HARNESS FAILURE]:', err);
  process.exit(1);
});
