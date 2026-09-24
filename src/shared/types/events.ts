import type { Provenance } from './sessions';

export interface EventEnvelope {
  event_id: string;
  event_type: string;
  schema_version: number;
  occurred_at: string;
  received_at: string;
  session_id: string | null;
  profile_id: string | null;
  context: string | null;
  actor: string;
  actor_role: string | null;
  modality: string | null;
  consent_scope: string | null;
  provenance: Provenance;
  retention_class: 'SESSION_ONLY' | 'RAW_TELEMETRY' | 'DERIVED_EVENT' | 'DERIVED_SUMMARY' | 'PERMANENT_AUDIT';
  payload_json: string; // JSON string of event-specific payload
}

// Known event types (non-exhaustive)
export const EventType = {
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_ENDED: 'SESSION_ENDED',
  QUALITY_CHECK_COMPLETE: 'QUALITY_CHECK_COMPLETE',
  CANDIDATE_EMITTED: 'CANDIDATE_EMITTED',
  HUMAN_DECISION_RECORDED: 'HUMAN_DECISION_RECORDED',
  APPROVED_OUTPUT_CREATED: 'APPROVED_OUTPUT_CREATED',
  AUDIO_REQUESTED: 'AUDIO_REQUESTED',
  AUDIO_COMPLETED: 'AUDIO_COMPLETED',
  AUDIO_FAILED: 'AUDIO_FAILED',
  PRACTICE_TASK_ASSIGNED: 'PRACTICE_TASK_ASSIGNED',
  PRACTICE_TASK_COMPLETED: 'PRACTICE_TASK_COMPLETED',
  KNOWLEDGE_SOURCE_CREATED: 'KNOWLEDGE_SOURCE_CREATED',
  KNOWLEDGE_SOURCE_APPROVED: 'KNOWLEDGE_SOURCE_APPROVED',
  KNOWLEDGE_SOURCE_SUPERSEDED: 'KNOWLEDGE_SOURCE_SUPERSEDED',
  KNOWLEDGE_SOURCE_REVOKED: 'KNOWLEDGE_SOURCE_REVOKED',
  RETRIEVAL_RUN_COMPLETED: 'RETRIEVAL_RUN_COMPLETED',
  TUTOR_RESPONSE_GENERATED: 'TUTOR_RESPONSE_GENERATED',
  FIXTURE_STARTED: 'FIXTURE_STARTED',
  FIXTURE_COMPLETED: 'FIXTURE_COMPLETED',
} as const;
export type EventType = typeof EventType[keyof typeof EventType];
