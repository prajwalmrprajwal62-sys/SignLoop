// retrieval.ts — aligned with actual DB schema (013_retrieval_runs.sql, 014_tutor_responses.sql)
// retrieval_runs: retrieval_id, query_type, query_text, profile_id, context, actor_role,
//   source_allowlist_json, filters_json, candidate_source_ids_json, selected_source_ids_json,
//   excluded_source_ids_json, index_version, policy_version, status, created_at
// tutor_responses: response_id, retrieval_id, answer_type, answer_text, recommended_action,
//   source_ids_json, evidence_window, retrieval_status, abstention_reason, policy_version, index_version, created_at

import type { SourceClass } from './knowledge';

export const TutorResponseStatus = {
  GROUNDED: 'GROUNDED',
  ABSTAINED: 'ABSTAINED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  NEEDS_TEACHER: 'NEEDS_TEACHER',
  SOURCES_CONFLICT: 'SOURCES_CONFLICT',
} as const;
export type TutorResponseStatus = typeof TutorResponseStatus[keyof typeof TutorResponseStatus];

export const TutorQueryType = {
  WHY_TASK: 'WHY_TASK',
  WHAT_NEXT: 'WHAT_NEXT',
  PROGRESS: 'PROGRESS',
  SHOW_REFERENCE: 'SHOW_REFERENCE',
  ASK_TEACHER: 'ASK_TEACHER',
  CONFLICT: 'CONFLICT',
} as const;
export type TutorQueryType = typeof TutorQueryType[keyof typeof TutorQueryType];

export interface RetrievalResult {
  source_id: string;
  source_class: SourceClass;
  content: string;
  intent_id: string | null;
  rank: number;
  relevance_score: number;
}

export interface TutorResponse {
  response_id: string;
  retrieval_id: string;
  answer_type: string;
  answer_text: string;
  recommended_action: string | null;
  source_ids_json: string;
  evidence_window: string | null;
  retrieval_status: TutorResponseStatus;
  abstention_reason: string | null;
  policy_version: string;
  index_version: string;
  created_at: string;
}
