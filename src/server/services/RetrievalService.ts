// RetrievalService.ts — FTS5 lexical retrieval. Authorization FIRST, then search.
// Only 3 source classes. Aligned with actual DB schema (013_retrieval_runs.sql)
// retrieval_runs: retrieval_id, query_type, query_text, profile_id, context, actor_role,
//   source_allowlist_json, filters_json, candidate_source_ids_json, selected_source_ids_json,
//   excluded_source_ids_json, index_version, policy_version, status, created_at
import { getDb } from '../db/connection';
import { EventService } from './EventService';
import type { RetrievalResult, TutorQueryType } from '../../shared/types/retrieval';
import type { SourceClass } from '../../shared/types/knowledge';

// CRITICAL: These are the ONLY three allowed source classes. Never add others.
const ALLOWED_SOURCE_CLASSES: SourceClass[] = [
  'TEACHER_KNOWLEDGE',
  'STUDENT_EVIDENCE',
  'APPROVED_TRAINING',
];

// Statuses excluded from retrieval — REVOKED, SUPERSEDED, DRAFT must never appear
const EXCLUDED_STATUSES = ['DRAFT', 'REVOKED', 'SUPERSEDED'];

export class RetrievalService {
  static retrieve(params: {
    profileId: string;
    context: string;
    role: string;
    consentGranted: boolean;
    queryText: string;
    intentId?: string;
    queryType: TutorQueryType;
    sessionId?: string;
  }): { results: RetrievalResult[]; retrievalId: string } {
    const db = getDb();
    const now = new Date().toISOString();

    // Step 1: Authorization check BEFORE any search
    if (!params.consentGranted) {
      throw new Error('RAG retrieval blocked: consent not granted for this profile/context.');
    }

    const allowedClasses = ALLOWED_SOURCE_CLASSES;
    const ftsQuery = params.queryText.trim().replace(/[^a-zA-Z0-9 ]/g, ' ').trim();

    const results: RetrievalResult[] = [];
    const candidateSourceIds: string[] = [];
    const selectedSourceIds: string[] = [];
    const excludedSourceIds: string[] = [];

    if (ftsQuery.length > 0) {
      try {
        const ftsResults = db.prepare(`
          SELECT ks.source_id, ks.source_class, ks.content, ks.intent_id,
                 fts.rank as relevance_score
          FROM knowledge_sources_fts fts
          JOIN knowledge_sources ks ON ks.rowid = fts.rowid
          WHERE knowledge_sources_fts MATCH ?
            AND ks.source_class IN (${allowedClasses.map(() => '?').join(',')})
            AND ks.status NOT IN (${EXCLUDED_STATUSES.map(() => '?').join(',')})
            AND (
              -- APPROVED_TRAINING: always globally available (seed knowledge, curriculum)
              ks.source_class = 'APPROVED_TRAINING'
              OR (
                -- TEACHER_KNOWLEDGE: global notes (profile_id IS NULL) OR student-specific Q&A for THIS student only
                -- FIX P0.3: student-specific Q&A (profile_id NOT NULL) must not leak to other students
                ks.source_class = 'TEACHER_KNOWLEDGE'
                AND (ks.profile_id IS NULL OR ks.profile_id = ?)
              )
              OR (
                -- STUDENT_EVIDENCE: always scoped to this student
                ks.source_class = 'STUDENT_EVIDENCE'
                AND ks.profile_id = ?
              )
            )
            AND (ks.context IS NULL OR ks.context = ?)
          ORDER BY fts.rank
          LIMIT 5
        `).all(
          ftsQuery,
          ...allowedClasses,
          ...EXCLUDED_STATUSES,
          params.profileId, // TEACHER_KNOWLEDGE student-scope
          params.profileId, // STUDENT_EVIDENCE scope
          params.context
        ) as Array<{ source_id: string; source_class: SourceClass; content: string; intent_id: string | null; relevance_score: number }>;

        results.push(...ftsResults.map((r, i) => ({ ...r, rank: i + 1 })));
        selectedSourceIds.push(...ftsResults.map(r => r.source_id));
      } catch {
        // FTS may fail if query is empty after sanitization — fall through to intent fallback
      }
    }

    if (results.length === 0 && params.intentId) {
      const intentResults = db.prepare(`
        SELECT source_id, source_class, content, intent_id, 0.5 as relevance_score
        FROM knowledge_sources
        WHERE source_class IN (${allowedClasses.map(() => '?').join(',')})
          AND status NOT IN (${EXCLUDED_STATUSES.map(() => '?').join(',')})
          AND (
            source_class = 'APPROVED_TRAINING'
            OR (
              -- FIX P0.3: student-specific TEACHER_KNOWLEDGE only for this student
              source_class = 'TEACHER_KNOWLEDGE'
              AND (profile_id IS NULL OR profile_id = ?)
            )
            OR (source_class = 'STUDENT_EVIDENCE' AND profile_id = ?)
          )
          AND (intent_id IS NULL OR intent_id LIKE ?)
          AND (context IS NULL OR context = ?)
        ORDER BY created_at DESC
        LIMIT 5
      `).all(
        ...allowedClasses,
        ...EXCLUDED_STATUSES,
        params.profileId, // TEACHER_KNOWLEDGE scope
        params.profileId, // STUDENT_EVIDENCE scope
        `%${params.intentId}%`,
        params.context
      ) as Array<{ source_id: string; source_class: SourceClass; content: string; intent_id: string | null; relevance_score: number }>;
      results.push(...intentResults.map((r, i) => ({ ...r, rank: i + 1 })));
      selectedSourceIds.push(...intentResults.map(r => r.source_id));
    }

    const hasConflict = this.detectConflicts(results);
    const runStatus = results.length === 0 ? 'INSUFFICIENT' : hasConflict ? 'CONFLICT' : 'SUCCESS';

    const retrievalId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO retrieval_runs (
        retrieval_id, query_type, query_text, profile_id, context, actor_role,
        source_allowlist_json, filters_json, candidate_source_ids_json, selected_source_ids_json,
        excluded_source_ids_json, index_version, policy_version, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      retrievalId,
      params.queryType,
      params.queryText,
      params.profileId,
      params.context,
      params.role,
      JSON.stringify(allowedClasses),
      JSON.stringify({ excludedStatuses: EXCLUDED_STATUSES }),
      JSON.stringify(candidateSourceIds),
      JSON.stringify(selectedSourceIds),
      JSON.stringify(excludedSourceIds),
      'local-fts-v1',
      'rag-policy-v1',
      runStatus,
      now
    );

    EventService.recordEvent({
      event_id: crypto.randomUUID(),
      event_type: 'RETRIEVAL_RUN_COMPLETED',
      schema_version: 1,
      occurred_at: now,
      session_id: params.sessionId ?? null,
      profile_id: params.profileId,
      context: params.context,
      actor: 'RETRIEVAL_SERVICE',
      actor_role: params.role,
      modality: null,
      consent_scope: params.context,
      provenance: 'LIVE',
      retention_class: 'DERIVED_EVENT',
      payload_json: JSON.stringify({ retrieval_id: retrievalId, results_count: results.length, had_conflict: hasConflict }),
    });

    return { results, retrievalId };
  }

  private static detectConflicts(results: RetrievalResult[]): boolean {
    const teacherNotes = results.filter(r => r.source_class === 'TEACHER_KNOWLEDGE');
    if (teacherNotes.length < 2) return false;
    const intentGroups = new Map<string, number>();
    for (const note of teacherNotes) {
      const intent = note.intent_id ?? 'general';
      intentGroups.set(intent, (intentGroups.get(intent) ?? 0) + 1);
    }
    return [...intentGroups.values()].some(count => count > 1);
  }

  static getRunById(retrievalId: string) {
    return getDb().prepare('SELECT * FROM retrieval_runs WHERE retrieval_id = ?').get(retrievalId);
  }
}
