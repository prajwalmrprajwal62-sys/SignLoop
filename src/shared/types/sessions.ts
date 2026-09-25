// sessions.ts — aligned with actual DB schema (003_sessions.sql)
// DB columns: id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at, ended_at

export const Provenance = {
  LIVE: 'LIVE',
  SIMULATED: 'SIMULATED',
  REPLAY: 'REPLAY',
  CACHED: 'CACHED',
} as const;
export type Provenance = typeof Provenance[keyof typeof Provenance];

export const SourceType = {
  GLOVE: 'GLOVE',
  CAMERA: 'CAMERA',
  SPECS: 'SPECS',
  SIMULATED: 'SIMULATED',
  REPLAY: 'REPLAY',
} as const;
export type SourceType = typeof SourceType[keyof typeof SourceType];

export interface Session {
  id: string;
  profile_id: string;
  context: string;
  role: string;
  source_modality: SourceType;
  provenance: Provenance;
  consent_scope: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'ABORTED';
  started_at: string;
  ended_at: string | null;
}
