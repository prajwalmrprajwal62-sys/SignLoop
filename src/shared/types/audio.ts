// audio.ts — aligned with actual DB schema (009_audio_events.sql)
// DB columns: audio_event_id, output_id, event_type, provider_or_device, failure_reason, occurred_at

export const AudioLifecycleState = {
  AUDIO_REQUESTED: 'AUDIO_REQUESTED',
  AUDIO_STARTED: 'AUDIO_STARTED',
  AUDIO_COMPLETED: 'AUDIO_COMPLETED',
  AUDIO_FAILED: 'AUDIO_FAILED',
  NOT_TRIGGERED: 'NOT_TRIGGERED',
} as const;
export type AudioLifecycleState = typeof AudioLifecycleState[keyof typeof AudioLifecycleState];

export interface AudioEvent {
  audio_event_id: string;
  output_id: string;
  event_type: 'AUDIO_REQUESTED' | 'AUDIO_STARTED' | 'AUDIO_COMPLETED' | 'AUDIO_FAILED' | 'PLAYBACK_UNKNOWN';
  provider_or_device: string | null;
  failure_reason: string | null;
  occurred_at: string;
}
