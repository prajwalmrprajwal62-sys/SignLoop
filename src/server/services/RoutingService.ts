// RoutingService.ts — 75% model-score routing gate
// CRITICAL: score is NEVER called 'accuracy' or 'confidence'
// DB columns: candidate_id, session_id, observation_id, intent_label, score, score_type,
//   routing_gate, policy_route, model_version, smoothing_window, why_reason_code, created_at
import { getDb } from '../db/connection';
import { EventService } from './EventService';
import type { Candidate, RoutingDecision } from '../../shared/types/routing';

const ROUTING_GATE = 0.75; // The model-score routing gate value — NEVER called 'accuracy' or 'confidence'

export class RoutingService {
  static route(params: {
    sessionId: string;
    profileId: string;
    context: string;
    role: string;
    provenance: string;
    intentLabel: string;
    modelScore: number | null; // null = unmeasured/unavailable; NEVER 0 when unavailable
    modelVersion?: string;
    qualityPassed: boolean;
  }): Candidate {
    const db = getDb();
    const now = new Date().toISOString();

    // Quality gate takes precedence — failed quality suppresses candidate entirely
    if (!params.qualityPassed) {
      throw new Error('Quality gate failed: candidate emission suppressed.');
    }

    const routing = this.determineRoute(params.modelScore);

    // Map INPUT_LOST to a valid DB value (DB only has CANDIDATE_READY/REVIEW_REQUIRED/SIGNAL_INVALID/NO_SIGN)
    const dbRoute = routing.policy_route === 'INPUT_LOST' ? 'SIGNAL_INVALID' : routing.policy_route;

    const candidate: Candidate = {
      candidate_id: crypto.randomUUID(),
      session_id: params.sessionId,
      observation_id: null,
      intent_label: params.intentLabel,
      score: params.modelScore, // Stored as-is; null means unmeasured
      score_type: 'model_score',
      routing_gate: ROUTING_GATE,
      policy_route: dbRoute,
      model_version: params.modelVersion ?? null,
      smoothing_window: null,
      why_reason_code: routing.why_reason_code,
      created_at: now,
    };

    db.prepare(`
      INSERT INTO candidates (
        candidate_id, session_id, observation_id, intent_label, score, score_type,
        routing_gate, policy_route, model_version, smoothing_window, why_reason_code, created_at
      ) VALUES (
        @candidate_id, @session_id, @observation_id, @intent_label, @score, @score_type,
        @routing_gate, @policy_route, @model_version, @smoothing_window, @why_reason_code, @created_at
      )
    `).run(candidate);

    EventService.recordEvent({
      event_id: crypto.randomUUID(),
      event_type: 'CANDIDATE_EMITTED',
      schema_version: 1,
      occurred_at: now,
      session_id: params.sessionId,
      profile_id: params.profileId,
      context: params.context,
      actor: 'CLASSIFIER',
      actor_role: params.role,
      modality: null,
      consent_scope: params.context,
      provenance: params.provenance as 'LIVE' | 'SIMULATED' | 'REPLAY' | 'CACHED',
      retention_class: 'DERIVED_EVENT',
      payload_json: JSON.stringify({
        candidate_id: candidate.candidate_id,
        intent_label: candidate.intent_label,
        model_score: candidate.score, // key is 'model_score' not 'accuracy' or 'confidence'
        routing_gate: ROUTING_GATE,
        policy_route: candidate.policy_route,
        why_sentence: routing.why_sentence,
      }),
    });

    return candidate;
  }

  private static determineRoute(modelScore: number | null): RoutingDecision {
    if (modelScore === null) {
      return {
        policy_route: 'SIGNAL_INVALID',
        model_score: null,
        routing_gate: ROUTING_GATE,
        why_reason_code: 'SCORE_UNAVAILABLE',
        why_sentence: 'Model score is unavailable. Signal may be incomplete or invalid.',
      };
    }
    if (modelScore >= ROUTING_GATE) {
      return {
        policy_route: 'CANDIDATE_READY',
        model_score: modelScore,
        routing_gate: ROUTING_GATE,
        why_reason_code: 'SCORE_ABOVE_GATE',
        why_sentence: `Model score ${Math.round(modelScore * 100)}% meets the 75% model-score routing gate.`,
      };
    }
    return {
      policy_route: 'REVIEW_REQUIRED',
      model_score: modelScore,
      routing_gate: ROUTING_GATE,
      why_reason_code: 'SCORE_BELOW_GATE',
      // EXACT wording from spec
      why_sentence: `Model score ${Math.round(modelScore * 100)}% is below the 75% model-score routing gate.`,
    };
  }

  static getCandidateById(candidateId: string): Candidate | undefined {
    return getDb().prepare('SELECT * FROM candidates WHERE candidate_id = ?').get(candidateId) as Candidate | undefined;
  }

  static getCandidatesForSession(sessionId: string): Candidate[] {
    return getDb().prepare('SELECT * FROM candidates WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as Candidate[];
  }

  static getAllCandidates(limit = 50): Candidate[] {
    return getDb().prepare('SELECT * FROM candidates ORDER BY created_at DESC LIMIT ?').all(limit) as Candidate[];
  }
}
