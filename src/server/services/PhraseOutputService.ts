// PhraseOutputService.ts — Phrase registry lookup + audio lifecycle
// audio_events: audio_event_id, output_id, event_type, provider_or_device, failure_reason, occurred_at
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection';
import { EventService } from './EventService';
import type { AudioEvent } from '../../shared/types/audio';

interface PhraseEntry {
  intent: string;
  phraseKey: string;
  caption: string;
  captions: Record<string, string>;
  audioAssetId: string | null;
  audioAsset: string | null;
  category: string;
  description: string;
}

let phraseRegistry: PhraseEntry[] | null = null;

function loadRegistry(): PhraseEntry[] {
  if (phraseRegistry) return phraseRegistry;
  const registryPath = path.resolve(process.cwd(), 'data', 'phrase-registry.json');
  const raw = JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as { entries: PhraseEntry[] };
  phraseRegistry = raw.entries;
  return phraseRegistry;
}

export class PhraseOutputService {
  static lookupCaption(intent: string, locale = 'en-IN'): { caption: string; audioAssetId: string | null } {
    const entries = loadRegistry();
    const entry = entries.find(e => e.intent === intent);
    if (!entry) return { caption: intent, audioAssetId: null };
    return {
      caption: entry.captions[locale] ?? entry.caption,
      audioAssetId: entry.audioAssetId,
    };
  }

  static lookupCaptionAndKey(intent: string, locale = 'en-IN'): { caption: string; phraseKey: string } {
    const entries = loadRegistry();
    const entry = entries.find(e => e.intent === intent);
    if (!entry) return { caption: intent, phraseKey: `phrase.${intent.toLowerCase()}` };
    return {
      caption: entry.captions[locale] ?? entry.caption,
      phraseKey: entry.phraseKey,
    };
  }

  static requestAudio(params: {
    outputId: string;
    intent: string;
    locale: string;
    sessionId: string;
    profileId: string;
    context: string;
    provenance: string;
  }): AudioEvent {
    const db = getDb();
    const now = new Date().toISOString();

    const audioEvent: AudioEvent = {
      audio_event_id: crypto.randomUUID(),
      output_id: params.outputId,
      event_type: 'AUDIO_REQUESTED',
      provider_or_device: null,
      failure_reason: null,
      occurred_at: now,
    };

    db.prepare(`
      INSERT INTO audio_events (audio_event_id, output_id, event_type, provider_or_device, failure_reason, occurred_at)
      VALUES (@audio_event_id, @output_id, @event_type, @provider_or_device, @failure_reason, @occurred_at)
    `).run(audioEvent);

    EventService.recordEvent({
      event_id: crypto.randomUUID(),
      event_type: 'AUDIO_REQUESTED',
      schema_version: 1,
      occurred_at: now,
      session_id: params.sessionId,
      profile_id: params.profileId,
      context: params.context,
      actor: 'SYSTEM',
      actor_role: null,
      modality: 'AUDIO',
      consent_scope: params.context,
      provenance: params.provenance as 'LIVE' | 'SIMULATED' | 'REPLAY' | 'CACHED',
      retention_class: 'DERIVED_EVENT',
      payload_json: JSON.stringify({ audio_event_id: audioEvent.audio_event_id, intent: params.intent }),
    });

    return audioEvent;
  }

  static updateAudioState(
    outputId: string,
    state: 'AUDIO_STARTED' | 'AUDIO_COMPLETED' | 'AUDIO_FAILED',
    failureReason?: string
  ): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audio_events (audio_event_id, output_id, event_type, provider_or_device, failure_reason, occurred_at)
      VALUES (?, ?, ?, NULL, ?, ?)
    `).run(crypto.randomUUID(), outputId, state, failureReason ?? null, now);
  }

  static getRegistry(): PhraseEntry[] {
    return loadRegistry();
  }
}
