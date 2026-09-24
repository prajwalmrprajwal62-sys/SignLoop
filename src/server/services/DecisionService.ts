// DecisionService.ts — Append-only decisions. NEVER mutate. Approved output only after decision.
// human_decisions: decision_id, candidate_id, action, final_intent, actor_profile_id, actor_role, note, created_at
// approved_outputs: output_id, decision_id, final_intent, phrase_key, locale, caption_text, created_at
import { getDb } from '../db/connection';
import { EventService } from './EventService';
import { PhraseOutputService } from './PhraseOutputService';
import type { HumanDecision, ApprovedOutput, DecisionAction } from '../../shared/types/decisions';

export class DecisionService {
  static record(params: {
    candidateId: string;
    action: DecisionAction;
    finalIntent?: string;
    actorProfileId?: string;
    actorRole: string;
    note?: string;
    sessionId: string;
    profileId: string;
    context: string;
    role: string;
    provenance: string;
  }): { decision: HumanDecision; approvedOutput?: ApprovedOutput } {
    const db = getDb();
    const now = new Date().toISOString();

    const candidate = db.prepare('SELECT * FROM candidates WHERE candidate_id = ?').get(params.candidateId) as {
      intent_label: string;
      session_id: string;
    } | undefined;
    if (!candidate) throw new Error(`Candidate ${params.candidateId} not found`);

    const decision: HumanDecision = {
      decision_id: crypto.randomUUID(),
      candidate_id: params.candidateId,
      action: params.action,
      final_intent: params.finalIntent ?? null,
      actor_profile_id: params.actorProfileId ?? null,
      actor_role: params.actorRole,
      note: params.note ?? null,
      created_at: now,
    };

    // APPEND: Never UPDATE or DELETE, always INSERT a new decision row
    db.prepare(`
      INSERT INTO human_decisions (decision_id, candidate_id, action, final_intent, actor_profile_id, actor_role, note, created_at)
      VALUES (@decision_id, @candidate_id, @action, @final_intent, @actor_profile_id, @actor_role, @note, @created_at)
    `).run(decision);

    EventService.recordEvent({
      event_id: crypto.randomUUID(),
      event_type: 'HUMAN_DECISION_RECORDED',
      schema_version: 1,
      occurred_at: now,
      session_id: params.sessionId,
      profile_id: params.profileId,
      context: params.context,
      actor: params.actorProfileId ?? 'HUMAN',
      actor_role: params.actorRole,
      modality: null,
      consent_scope: params.context,
      provenance: params.provenance as 'LIVE' | 'SIMULATED' | 'REPLAY' | 'CACHED',
      retention_class: 'PERMANENT_AUDIT',
      payload_json: JSON.stringify({
        decision_id: decision.decision_id,
        candidate_id: params.candidateId,
        action: params.action,
        final_intent: decision.final_intent,
      }),
    });

    // Create ApprovedOutput ONLY after CONFIRM or CORRECT decisions
    // Caption text NEVER visible before a human decision
    let approvedOutput: ApprovedOutput | undefined;
    if (params.action === 'CONFIRM' || params.action === 'CORRECT') {
      const finalIntent = params.finalIntent ?? candidate.intent_label;
      const { caption, phraseKey } = PhraseOutputService.lookupCaptionAndKey(finalIntent, 'en-IN');

      approvedOutput = {
        output_id: crypto.randomUUID(),
        decision_id: decision.decision_id,
        final_intent: finalIntent,
        phrase_key: phraseKey,
        locale: 'en-IN',
        caption_text: caption,
        created_at: now,
      };

      db.prepare(`
        INSERT INTO approved_outputs (output_id, decision_id, final_intent, phrase_key, locale, caption_text, created_at)
        VALUES (@output_id, @decision_id, @final_intent, @phrase_key, @locale, @caption_text, @created_at)
      `).run(approvedOutput);

      EventService.recordEvent({
        event_id: crypto.randomUUID(),
        event_type: 'APPROVED_OUTPUT_CREATED',
        schema_version: 1,
        occurred_at: now,
        session_id: params.sessionId,
        profile_id: params.profileId,
        context: params.context,
        actor: params.actorProfileId ?? 'SYSTEM',
        actor_role: params.actorRole,
        modality: null,
        consent_scope: params.context,
        provenance: params.provenance as 'LIVE' | 'SIMULATED' | 'REPLAY' | 'CACHED',
        retention_class: 'DERIVED_SUMMARY',
        payload_json: JSON.stringify({ output_id: approvedOutput.output_id, final_intent: finalIntent }),
      });
    }

    return { decision, approvedOutput };
  }

  static getDecisionsForCandidate(candidateId: string): HumanDecision[] {
    return getDb().prepare('SELECT * FROM human_decisions WHERE candidate_id = ? ORDER BY created_at ASC').all(candidateId) as HumanDecision[];
  }

  static getApprovedOutputForDecision(decisionId: string): ApprovedOutput | undefined {
    return getDb().prepare('SELECT * FROM approved_outputs WHERE decision_id = ?').get(decisionId) as ApprovedOutput | undefined;
  }

  static getApprovedOutputsBySession(sessionId: string): ApprovedOutput[] {
    // Join through human_decisions -> candidates to find outputs for this session
    return getDb().prepare(`
      SELECT ao.*
      FROM approved_outputs ao
      JOIN human_decisions hd ON hd.decision_id = ao.decision_id
      JOIN candidates c ON c.candidate_id = hd.candidate_id
      WHERE c.session_id = ?
      ORDER BY ao.created_at DESC
    `).all(sessionId) as ApprovedOutput[];
  }
}
