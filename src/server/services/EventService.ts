// EventService.ts — ONLY place that writes to the events table
import { getDb } from '../db/connection';
import type { EventEnvelope } from '../../shared/types/events';

export class EventService {
  static recordEvent(envelope: Omit<EventEnvelope, 'received_at'>): string {
    const db = getDb();
    const received_at = new Date().toISOString();
    const record = { ...envelope, received_at };
    db.prepare(`
      INSERT INTO events (
        event_id, event_type, schema_version, occurred_at, received_at,
        session_id, profile_id, context, actor, actor_role, modality,
        consent_scope, provenance, retention_class, payload_json
      ) VALUES (
        @event_id, @event_type, @schema_version, @occurred_at, @received_at,
        @session_id, @profile_id, @context, @actor, @actor_role, @modality,
        @consent_scope, @provenance, @retention_class, @payload_json
      )
    `).run(record);
    return envelope.event_id;
  }

  static getEventsBySession(sessionId: string): EventEnvelope[] {
    const db = getDb();
    return db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY occurred_at ASC').all(sessionId) as EventEnvelope[];
  }

  static getEventsByProfile(profileId: string, limit = 50): EventEnvelope[] {
    const db = getDb();
    return db.prepare('SELECT * FROM events WHERE profile_id = ? ORDER BY occurred_at DESC LIMIT ?').all(profileId, limit) as EventEnvelope[];
  }
}
