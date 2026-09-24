import { create } from 'zustand';

interface QualityCheck {
  check_id: string;
  check_name: string;
  status: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  observed_value: string | null;
  repair_hint: string | null;
}

interface Candidate {
  candidate_id: string;
  intent_label: string;
  score: number | null;
  policy_route: string;
  why_reason_code: string | null;
  why_sentence?: string;
}

interface Decision {
  decision_id: string;
  action: string;
  final_intent: string | null;
}

interface ApprovedOutput {
  output_id: string;
  final_intent: string;
  caption_text: string;
  locale: string;
}

interface LiveStore {
  qualityChecks: QualityCheck[];
  qualityOverall: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  candidate: Candidate | null;
  decision: Decision | null;
  approvedOutput: ApprovedOutput | null;
  isRunning: boolean;
  setQualityResult: (checks: QualityCheck[], overall: 'PASS' | 'FAIL' | 'NOT_EVALUATED') => void;
  setCandidate: (candidate: Candidate | null) => void;
  setDecision: (decision: Decision | null) => void;
  setApprovedOutput: (output: ApprovedOutput | null) => void;
  setRunning: (running: boolean) => void;
  resetLive: () => void;
}

export const useLiveStore = create<LiveStore>((set) => ({
  qualityChecks: [],
  qualityOverall: 'NOT_EVALUATED',
  candidate: null,
  decision: null,
  approvedOutput: null,
  isRunning: false,
  setQualityResult: (checks, overall) => set({ qualityChecks: checks, qualityOverall: overall }),
  setCandidate: (candidate) => set({ candidate }),
  setDecision: (decision) => set({ decision }),
  setApprovedOutput: (output) => set({ approvedOutput: output }),
  setRunning: (running) => set({ isRunning: running }),
  resetLive: () => set({
    qualityChecks: [],
    qualityOverall: 'NOT_EVALUATED',
    candidate: null,
    decision: null,
    approvedOutput: null,
  }),
}));
