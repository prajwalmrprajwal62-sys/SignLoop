// ReplayService.ts — Deterministic fixture replay
// Same fixture ID always gives same result

interface FixtureDefinition {
  fixture_id: string;
  label: string;
  description: string;
  source_type: string;
  provenance: 'REPLAY';
  intent_label?: string;
  model_score?: number | null;
  policy_route?: string;
  force_quality_fail?: string;
  quality_pass?: boolean;
  human_action?: string;
  rag_query_type?: string;
  rag_sources?: string[];
  expected_tutor_status?: string;
  mode?: string;
  why_sentence?: string;
}

const FIXTURES: FixtureDefinition[] = [
  {
    fixture_id: 'fixture-a-success-confirm',
    label: 'A: Success Confirm',
    description: 'HELP gesture, score 0.82 (above gate), routed CANDIDATE_READY, human CONFIRMs.',
    source_type: 'REPLAY', provenance: 'REPLAY',
    intent_label: 'HELP', model_score: 0.82, policy_route: 'CANDIDATE_READY', quality_pass: true,
    human_action: 'CONFIRM',
  },
  {
    fixture_id: 'fixture-b-review-below-gate',
    label: 'B: Review Below Gate',
    description: 'WATER gesture, score 0.68 (below gate), REVIEW_REQUIRED, teacher corrects.',
    source_type: 'REPLAY', provenance: 'REPLAY',
    intent_label: 'WATER', model_score: 0.68, policy_route: 'REVIEW_REQUIRED', quality_pass: true,
    why_sentence: 'Model score 68% is below the 75% model-score routing gate.',
    human_action: 'CORRECT',
  },
  {
    fixture_id: 'fixture-c-invalid-input',
    label: 'C: Invalid Input',
    description: 'Quality check fails → SIGNAL_INVALID → no candidate emitted.',
    source_type: 'REPLAY', provenance: 'REPLAY',
    quality_pass: false, force_quality_fail: 'SIGNAL_PRESENT', policy_route: 'SIGNAL_INVALID',
    intent_label: undefined, model_score: null,
  },
  {
    fixture_id: 'fixture-d-rag-grounded',
    label: 'D: RAG Grounded',
    description: 'WHY_TASK query with TNOTE-001 + EVID-001 → GROUNDED response.',
    source_type: 'REPLAY', provenance: 'REPLAY',
    quality_pass: true, rag_query_type: 'WHY_TASK',
    rag_sources: ['TNOTE-001', 'EVID-001'], expected_tutor_status: 'GROUNDED',
  },
  {
    fixture_id: 'fixture-e-rag-abstain',
    label: 'E: RAG Abstain',
    description: 'Unsupported query → TUTOR_ABSTAINED (INSUFFICIENT_EVIDENCE).',
    source_type: 'REPLAY', provenance: 'REPLAY',
    quality_pass: true, rag_query_type: 'ASK_TEACHER',
    expected_tutor_status: 'INSUFFICIENT_EVIDENCE',
  },
  {
    fixture_id: 'fixture-f-rag-conflict',
    label: 'F: RAG Conflict',
    description: 'Conflicting active teacher notes → SOURCES_CONFLICT.',
    source_type: 'REPLAY', provenance: 'REPLAY',
    quality_pass: true, rag_query_type: 'WHY_TASK',
    expected_tutor_status: 'SOURCES_CONFLICT',
  },
  {
    fixture_id: 'fixture-g-teach-mode',
    label: 'G: Teach Mode',
    description: 'TEACH mode, REPEAT candidate, teacher confirms.',
    source_type: 'REPLAY', provenance: 'REPLAY',
    mode: 'TEACH', intent_label: 'REPEAT', model_score: 0.79,
    policy_route: 'CANDIDATE_READY', quality_pass: true, human_action: 'CONFIRM',
  },
];

export class ReplayService {
  static getAll(): FixtureDefinition[] {
    return FIXTURES;
  }

  static getById(fixtureId: string): FixtureDefinition | undefined {
    return FIXTURES.find(f => f.fixture_id === fixtureId);
  }

  static run(fixtureId: string): { fixture: FixtureDefinition; state: Record<string, unknown> } {
    const fixture = this.getById(fixtureId);
    if (!fixture) throw new Error(`Unknown fixture: ${fixtureId}`);
    return {
      fixture,
      state: {
        provenance: 'REPLAY',
        source_type: fixture.source_type,
        quality_pass: fixture.quality_pass ?? true,
        force_quality_fail: fixture.force_quality_fail ?? null,
        intent_label: fixture.intent_label ?? null,
        model_score: fixture.model_score ?? null,
        policy_route: fixture.policy_route ?? null,
        why_sentence: fixture.why_sentence ?? null,
        human_action: fixture.human_action ?? null,
        rag_query_type: fixture.rag_query_type ?? null,
        rag_sources: fixture.rag_sources ?? [],
        expected_tutor_status: fixture.expected_tutor_status ?? null,
        mode: fixture.mode ?? 'COMMUNICATE',
        badge: 'REPLAY',
      },
    };
  }
}
