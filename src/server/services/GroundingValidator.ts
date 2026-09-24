// GroundingValidator.ts — Validates that all claims are grounded in retrieved sources
import type { RetrievalResult, TutorResponseStatus } from '../../shared/types/retrieval';

export interface ValidationResult {
  status: TutorResponseStatus;
  answer_text: string;
  source_ids: string[];
  has_conflict: boolean;
  abstention_reason: string | null;
}

const TEMPLATES = {
  WHY_TASK: (sources: RetrievalResult[], intent: string) =>
    `Based on teacher notes for "${intent}": ${sources.map(s => s.content).join(' | ')} [Sources: ${sources.map(s => s.source_id).join(', ')}]`,
  WHAT_NEXT: (sources: RetrievalResult[]) =>
    `Next practice recommendation: ${sources.map(s => s.content).join(' | ')} [Sources: ${sources.map(s => s.source_id).join(', ')}]`,
  PROGRESS: (sources: RetrievalResult[]) =>
    `Evidence summary: ${sources.map(s => s.content).join(' | ')} [Sources: ${sources.map(s => s.source_id).join(', ')}]`,
  SHOW_REFERENCE: (sources: RetrievalResult[]) =>
    `Gesture reference: ${sources.map(s => s.content).join(' | ')} [Sources: ${sources.map(s => s.source_id).join(', ')}]`,
  ASK_TEACHER: () => 'This question requires teacher input. No approved evidence found.',
  CONFLICT: (sources: RetrievalResult[]) =>
    `Multiple notes found with potentially conflicting guidance. Please ask your teacher to clarify. [Sources: ${sources.map(s => s.source_id).join(', ')}]`,
  ABSTAINED: () => 'I do not have enough approved evidence to answer this. Ask your teacher.',
};

export class GroundingValidator {
  static validate(params: {
    results: RetrievalResult[];
    queryType: string;
    hasConflict: boolean;
    intentId?: string;
  }): ValidationResult {
    const { results, queryType, hasConflict } = params;

    if (results.length === 0) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        answer_text: TEMPLATES.ABSTAINED(),
        source_ids: [],
        has_conflict: false,
        abstention_reason: 'No approved sources found for this query.',
      };
    }

    if (hasConflict) {
      return {
        status: 'SOURCES_CONFLICT',
        answer_text: TEMPLATES.CONFLICT(results),
        source_ids: results.map(r => r.source_id),
        has_conflict: true,
        abstention_reason: 'Multiple teacher notes found with conflicting guidance.',
      };
    }

    const sourceIds = results.map(r => r.source_id);
    let answerText: string;

    switch (queryType) {
      case 'WHY_TASK': answerText = TEMPLATES.WHY_TASK(results, params.intentId ?? ''); break;
      case 'WHAT_NEXT': answerText = TEMPLATES.WHAT_NEXT(results); break;
      case 'PROGRESS': answerText = TEMPLATES.PROGRESS(results); break;
      case 'SHOW_REFERENCE': answerText = TEMPLATES.SHOW_REFERENCE(results); break;
      case 'ASK_TEACHER': answerText = TEMPLATES.ASK_TEACHER(); break;
      default: answerText = TEMPLATES.WHY_TASK(results, params.intentId ?? '');
    }

    return {
      status: 'GROUNDED',
      answer_text: answerText,
      source_ids: sourceIds,
      has_conflict: false,
      abstention_reason: null,
    };
  }
}
