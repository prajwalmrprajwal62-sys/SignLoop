// routing.ts — aligned with actual DB schema (006_candidates.sql)
// DB columns: candidate_id, session_id, observation_id, intent_label, score, score_type,
//             routing_gate, policy_route, model_version, smoothing_window, why_reason_code, created_at
// CRITICAL: score is NEVER called 'accuracy' or 'confidence'
// The 75% value is ALWAYS the 'model-score routing gate'

export const PolicyRoute = {
  CANDIDATE_READY: 'CANDIDATE_READY',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  SIGNAL_INVALID: 'SIGNAL_INVALID',
  NO_SIGN: 'NO_SIGN',
  INPUT_LOST: 'INPUT_LOST',
} as const;
export type PolicyRoute = typeof PolicyRoute[keyof typeof PolicyRoute];

export interface RoutingDecision {
  policy_route: PolicyRoute;
  model_score: number | null; // null means unmeasured, NEVER 0
  routing_gate: 0.75;
  why_reason_code: string;
  why_sentence: string; // e.g. 'model score 68% is below the 75% model-score routing gate.'
}

export interface Candidate {
  candidate_id: string;
  session_id: string;
  observation_id: string | null;
  intent_label: string;
  score: number | null; // NULL = unmeasured; NEVER silently convert to 0
  score_type: 'model_score';
  routing_gate: number;
  policy_route: string;
  model_version: string | null;
  smoothing_window: string | null;
  why_reason_code: string | null;
  created_at: string;
}
