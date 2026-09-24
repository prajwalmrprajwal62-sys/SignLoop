// SimulatedAdapter.ts — 8 deterministic simulated scenarios covering all status paths
export interface SimulatedScenario {
  id: string;
  label: string;
  description: string;
  intent_label: string;
  model_score: number | null;
  quality_pass: boolean;
  force_quality_fail?: string;
  expected_route: string;
  why_sentence: string;
}

const SCENARIOS: SimulatedScenario[] = [
  {
    id: 'sim-01-high-score',
    label: 'High Model Score',
    description: 'Score 0.90 → CANDIDATE_READY',
    intent_label: 'HELP', model_score: 0.90, quality_pass: true,
    expected_route: 'CANDIDATE_READY',
    why_sentence: 'Model score 90% meets the 75% model-score routing gate.',
  },
  {
    id: 'sim-02-below-gate',
    label: 'Below Gate',
    description: 'Score 0.62 → REVIEW_REQUIRED',
    intent_label: 'WATER', model_score: 0.62, quality_pass: true,
    expected_route: 'REVIEW_REQUIRED',
    why_sentence: 'Model score 62% is below the 75% model-score routing gate.',
  },
  {
    id: 'sim-03-at-gate',
    label: 'At Gate (boundary)',
    description: 'Score exactly 0.75 → CANDIDATE_READY',
    intent_label: 'FOOD', model_score: 0.75, quality_pass: true,
    expected_route: 'CANDIDATE_READY',
    why_sentence: 'Model score 75% meets the 75% model-score routing gate.',
  },
  {
    id: 'sim-04-no-score',
    label: 'No Model Score',
    description: 'Score null → SIGNAL_INVALID',
    intent_label: 'PAIN', model_score: null, quality_pass: true,
    expected_route: 'SIGNAL_INVALID',
    why_sentence: 'Model score is unavailable. Signal may be incomplete or invalid.',
  },
  {
    id: 'sim-05-quality-fail',
    label: 'Quality Fail',
    description: 'SIGNAL_PRESENT fails → no candidate',
    intent_label: 'REPEAT', model_score: null, quality_pass: false,
    force_quality_fail: 'SIGNAL_PRESENT',
    expected_route: 'SIGNAL_INVALID',
    why_sentence: 'Quality gate failed: SIGNAL_PRESENT check failed.',
  },
  {
    id: 'sim-06-frame-rate-fail',
    label: 'Frame Rate Fail',
    description: 'FRAME_RATE_SUFFICIENT fails',
    intent_label: 'TOILET', model_score: null, quality_pass: false,
    force_quality_fail: 'FRAME_RATE_SUFFICIENT',
    expected_route: 'SIGNAL_INVALID',
    why_sentence: 'Quality gate failed: FRAME_RATE_SUFFICIENT check failed.',
  },
  {
    id: 'sim-07-no-sign',
    label: 'No Sign Detected',
    description: 'HAND_DETECTED fails → no candidate',
    intent_label: 'DOCTOR', model_score: null, quality_pass: false,
    force_quality_fail: 'HAND_DETECTED',
    expected_route: 'SIGNAL_INVALID',
    why_sentence: 'Quality gate failed: HAND_DETECTED check failed.',
  },
  {
    id: 'sim-08-below-threshold',
    label: 'Very Low Score',
    description: 'Score 0.20 → REVIEW_REQUIRED',
    intent_label: 'FAMILY', model_score: 0.20, quality_pass: true,
    expected_route: 'REVIEW_REQUIRED',
    why_sentence: 'Model score 20% is below the 75% model-score routing gate.',
  },
];

export class SimulatedAdapter {
  static getAll(): SimulatedScenario[] {
    return SCENARIOS;
  }

  static getById(id: string): SimulatedScenario | undefined {
    return SCENARIOS.find(s => s.id === id);
  }
}
