import { fileURLToPath } from 'url';
import { getDb, closeDb } from './connection';

const __filename = fileURLToPath(import.meta.url);

export function seedDatabase(options: { silent?: boolean } = {}): void {
  const db = getDb();
  const now = new Date().toISOString();

  if (!options.silent) {
    console.log('[db:seed] Starting database seeding in a single transaction...');
  }

  const seedTransaction = db.transaction(() => {
    // ------------------------------------------------------------------------
    // 1. Profiles
    // ------------------------------------------------------------------------
    const insertProfile = db.prepare(`
      INSERT OR REPLACE INTO profiles (
        id, pseudonymous_code, role, preferred_locale, visibility_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertProfile.run('prof-stu-01', 'STU-01', 'STUDENT', 'en-IN', 'ACTIVE', now, now);
    insertProfile.run('prof-stu-02', 'STU-02', 'STUDENT', 'en-IN', 'ACTIVE', now, now);
    insertProfile.run('prof-trn-01', 'TRN-01', 'TEACHER', 'en-IN', 'ACTIVE', now, now);
    insertProfile.run('prof-staff-01', 'STAFF-01', 'STAFF', 'en-IN', 'ACTIVE', now, now);

    // ------------------------------------------------------------------------
    // 2. Profile Contexts
    // ------------------------------------------------------------------------
    const insertContext = db.prepare(`
      INSERT OR REPLACE INTO profile_contexts (
        id, profile_id, context_type, consent_status, output_modality, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertContext.run('ctx-stu-01-learn', 'prof-stu-01', 'LEARNING_PRACTICE', 'GRANTED', 'TEXT_AND_AUDIO', 1, now, now);
    insertContext.run('ctx-stu-01-comm', 'prof-stu-01', 'REAL_WORLD_INTERACTION', 'GRANTED', 'TEXT_AND_AUDIO', 1, now, now);
    insertContext.run('ctx-stu-02-learn', 'prof-stu-02', 'LEARNING_PRACTICE', 'GRANTED', 'TEXT_AND_AUDIO', 1, now, now);
    insertContext.run('ctx-trn-01-learn', 'prof-trn-01', 'LEARNING_PRACTICE', 'GRANTED', 'TEXT_AND_AUDIO', 1, now, now);
    insertContext.run('ctx-staff-01-comm', 'prof-staff-01', 'REAL_WORLD_INTERACTION', 'GRANTED', 'TEXT_AND_AUDIO', 1, now, now);

    // ------------------------------------------------------------------------
    // 3. Consent and Retention Records
    // ------------------------------------------------------------------------
    const insertConsent = db.prepare(`
      INSERT OR REPLACE INTO consent_and_retention (
        record_id, profile_id, scope, status, raw_media_policy, derived_event_policy, retention_until, revoked_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertConsent.run('cons-stu-01-train', 'prof-stu-01', 'TRAINING_GROUNDING', 'ACTIVE', 'NOT_STORED', 'STORED_UNTIL_REVOKED', null, null, now);
    insertConsent.run('cons-stu-01-sess', 'prof-stu-01', 'SESSION_ONLY', 'ACTIVE', 'NOT_STORED', 'STORED_UNTIL_REVOKED', null, null, now);
    insertConsent.run('cons-stu-02-train', 'prof-stu-02', 'TRAINING_GROUNDING', 'ACTIVE', 'NOT_STORED', 'STORED_UNTIL_REVOKED', null, null, now);
    insertConsent.run('cons-trn-01-train', 'prof-trn-01', 'TRAINING_GROUNDING', 'ACTIVE', 'NOT_STORED', 'STORED_UNTIL_REVOKED', null, null, now);
    insertConsent.run('cons-staff-01-sess', 'prof-staff-01', 'SESSION_ONLY', 'ACTIVE', 'NOT_STORED', 'STORED_UNTIL_REVOKED', null, null, now);

    // ------------------------------------------------------------------------
    // 4. Practice Tasks
    // ------------------------------------------------------------------------
    const insertTask = db.prepare(`
      INSERT OR REPLACE INTO practice_tasks (
        task_id, profile_id, context, intent_id, instruction, source_teacher_note_id, priority, status, target_repetitions, completed_repetitions, created_at, due_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run(
      'task-stu-01-help',
      'prof-stu-01',
      'LEARNING_PRACTICE',
      'HELP',
      'Practise HELP slowly and wait for the full motion before repeating.',
      'TNOTE-002',
      'HIGH',
      'IN_PROGRESS',
      5,
      3,
      now,
      null
    );

    insertTask.run(
      'task-stu-01-repeat',
      'prof-stu-01',
      'LEARNING_PRACTICE',
      'REPEAT',
      'Practise separating REPEAT from HELP.',
      'TNOTE-001',
      'MEDIUM',
      'ASSIGNED',
      5,
      0,
      now,
      null
    );

    // ------------------------------------------------------------------------
    // 5. Follow-Up Cases
    // ------------------------------------------------------------------------
    const insertFollowUp = db.prepare(`
      INSERT OR REPLACE INTO follow_up_cases (
        case_id, profile_id, context, intent_id, source_channel, correction_event_id, correction_reason, created_at, due_at, target_repetitions, minimum_eligible_attempts, status, trainer_owner, policy_snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFollowUp.run(
      'case-stu-01-water',
      'prof-stu-01',
      'LEARNING_PRACTICE',
      'WATER',
      'TRAINER_REVIEW',
      null,
      'Model score 68% fell below the 75% model-score routing gate on WATER attempt.',
      now,
      null,
      10,
      5,
      'IN_REVIEW',
      'prof-trn-01',
      JSON.stringify({ routing_gate: 0.75, minimum_attempts: 5, rule: 'min_5_attempts_required' })
    );

    // ------------------------------------------------------------------------
    // 6. Knowledge Sources (Teacher Notes, Student Evidence, Approved Training)
    // Note: Inserting here automatically fires knowledge_sources_ai trigger into FTS5
    // ------------------------------------------------------------------------
    const insertKnowledge = db.prepare(`
      INSERT OR REPLACE INTO knowledge_sources (
        source_id, source_class, profile_id, context, intent_id, task_id, author_id, author_role,
        source_title, content, content_type, locale, status, version, supersedes_id,
        session_id, event_id, consent_scope, retention_class, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // TNOTE-001: Teacher Note for STU-01
    insertKnowledge.run(
      'TNOTE-001',
      'TEACHER_KNOWLEDGE',
      'prof-stu-01',
      'LEARNING_PRACTICE',
      'HELP,REPEAT',
      'task-stu-01-repeat',
      'prof-trn-01',
      'TEACHER',
      'Confusion correction: HELP vs REPEAT',
      'Student is confusing HELP and REPEAT. Practise them separately.',
      'CORRECTION',
      'en-IN',
      'APPROVED',
      1,
      null,
      null,
      null,
      'LEARNING_PRACTICE',
      'DERIVED_SUMMARY',
      now,
      now
    );

    // TNOTE-002: Teacher Note for STU-01
    insertKnowledge.run(
      'TNOTE-002',
      'TEACHER_KNOWLEDGE',
      'prof-stu-01',
      'LEARNING_PRACTICE',
      'HELP',
      'task-stu-01-help',
      'prof-trn-01',
      'TEACHER',
      'Execution instruction: HELP gesture',
      'Practise HELP slowly and wait for the full motion before repeating.',
      'INSTRUCTION',
      'en-IN',
      'APPROVED',
      1,
      null,
      null,
      null,
      'LEARNING_PRACTICE',
      'DERIVED_SUMMARY',
      now,
      now
    );

    // TNOTE-003: Teacher Note for STU-02
    insertKnowledge.run(
      'TNOTE-003',
      'TEACHER_KNOWLEDGE',
      'prof-stu-02',
      'LEARNING_PRACTICE',
      'REPEAT',
      null,
      'prof-trn-01',
      'TEACHER',
      'Session Goal: REPEAT review',
      'Review the approved REPEAT gesture in the next session.',
      'GOAL',
      'en-IN',
      'APPROVED',
      1,
      null,
      null,
      null,
      'LEARNING_PRACTICE',
      'DERIVED_SUMMARY',
      now,
      now
    );

    // EVID-001: Student Evidence for STU-01 (HELP)
    insertKnowledge.run(
      'EVID-001',
      'STUDENT_EVIDENCE',
      'prof-stu-01',
      'LEARNING_PRACTICE',
      'HELP',
      'task-stu-01-help',
      'SYSTEM',
      'EVIDENCE_AGGREGATOR',
      'Interaction history: HELP (5 attempts)',
      'Eligible attempts: 5. Review cases: 2. Confirmed: 3. Source: REPLAY.',
      'EVIDENCE_SUMMARY',
      'en-IN',
      'APPROVED',
      1,
      null,
      null,
      null,
      'LEARNING_PRACTICE',
      'DERIVED_SUMMARY',
      now,
      now
    );

    // EVID-002: Student Evidence for STU-01 (REPEAT)
    insertKnowledge.run(
      'EVID-002',
      'STUDENT_EVIDENCE',
      'prof-stu-01',
      'LEARNING_PRACTICE',
      'REPEAT',
      'task-stu-01-repeat',
      'SYSTEM',
      'EVIDENCE_AGGREGATOR',
      'Interaction history: REPEAT (4 attempts)',
      'Eligible attempts: 4. Review cases: 2. Confirmed: 2. Source: REPLAY.',
      'EVIDENCE_SUMMARY',
      'en-IN',
      'APPROVED',
      1,
      null,
      null,
      null,
      'LEARNING_PRACTICE',
      'DERIVED_SUMMARY',
      now,
      now
    );

    // TRAIN-001: Approved Curriculum Training
    insertKnowledge.run(
      'TRAIN-001',
      'APPROVED_TRAINING',
      null,
      'LEARNING_PRACTICE',
      'HELP',
      null,
      'prof-trn-01',
      'TEACHER',
      'Approved Gesture Reference: HELP',
      'Closed fist with thumb extended upward resting on open palm of non-dominant hand, lifting slightly together.',
      'GESTURE_SPEC',
      'en-IN',
      'APPROVED',
      1,
      null,
      null,
      null,
      'GLOBAL',
      'CURRICULUM',
      now,
      now
    );
  });

  seedTransaction();

  // --------------------------------------------------------------------------
  // Verification: Check FTS5 sync
  // --------------------------------------------------------------------------
  const ftsCountRow = db.prepare('SELECT count(*) as count FROM knowledge_sources_fts').get() as { count: number };
  if (!options.silent) {
    console.log(`[db:seed] Seeding complete. Verified FTS5 indexed rows: ${ftsCountRow.count}`);
  }
}

// CLI execution handling
const isDirectExecution = process.argv[1] && (
  process.argv[1] === __filename ||
  process.argv[1].endsWith('seed.ts') ||
  process.argv[1].endsWith('seed.js')
);

if (isDirectExecution) {
  try {
    seedDatabase();
    console.log('[db:seed] Database seeded successfully.');
    closeDb();
    process.exit(0);
  } catch (error) {
    console.error('[db:seed] Seeding failed with error:', error);
    closeDb();
    process.exit(1);
  }
}
