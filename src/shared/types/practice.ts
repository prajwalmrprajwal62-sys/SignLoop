export const ComparisonVerdict = {
  IMPROVED: 'IMPROVED',
  STABLE: 'STABLE',
  WORSE: 'WORSE',
  UNCLEAR: 'UNCLEAR',
} as const;
export type ComparisonVerdict = typeof ComparisonVerdict[keyof typeof ComparisonVerdict];

export interface PracticeTask {
  task_id: string;
  profile_id: string;
  context: string;
  intent_id: string;
  instruction: string | null;
  source_teacher_note_id: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  target_repetitions: number;
  completed_repetitions: number;
  created_at: string;
  due_at: string | null;
}

export interface FollowUpCase {
  case_id: string;
  profile_id: string;
  context: string;
  intent_id: string;
  source_channel: string;
  correction_event_id: string | null;
  correction_reason: string | null;
  created_at: string;
  due_at: string | null;
  target_repetitions: number;
  minimum_eligible_attempts: number;
  status: 'OPEN' | 'IN_REVIEW' | 'IMPROVED' | 'STABLE' | 'WORSE' | 'UNCLEAR' | 'CLOSED';
  trainer_owner: string | null;
  policy_snapshot_json: string;
}

export interface FollowUpComparison {
  verdict: ComparisonVerdict;
  // UNCLEAR when minimum_eligible_attempts not met — NEVER invent a trend
  before_count: number | null;
  after_count: number | null;
  delta: number | null;
  reason: string;
  minimum_attempts_met: boolean;
}
