// decisions.ts — aligned with actual DB schema (007_human_decisions.sql, 008_approved_outputs.sql)
// human_decisions: decision_id, candidate_id, action, final_intent, actor_profile_id, actor_role, note, created_at
// approved_outputs: output_id, decision_id, final_intent, phrase_key, locale, caption_text, created_at

export const DecisionAction = {
  CONFIRM: 'CONFIRM',
  CORRECT: 'CORRECT',
  REJECT: 'REJECT',
  REQUEST_REPEAT: 'REQUEST_REPEAT',
  MARK_INSUFFICIENT: 'MARK_INSUFFICIENT',
} as const;
export type DecisionAction = typeof DecisionAction[keyof typeof DecisionAction];

export interface HumanDecision {
  decision_id: string;
  candidate_id: string;
  action: DecisionAction;
  final_intent: string | null;
  actor_profile_id: string | null;
  actor_role: string;
  note: string | null;
  created_at: string;
}

export interface ApprovedOutput {
  output_id: string;
  decision_id: string;
  final_intent: string;
  phrase_key: string;
  locale: string;
  caption_text: string;
  created_at: string;
}
