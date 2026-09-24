// SessionService.ts — Session lifecycle, aligned with actual DB schema
// DB columns: id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at, ended_at
import { getDb } from '../db/connection';
import { EventService } from './EventService';
import type { Session, SourceType, Provenance } from '../../shared/types/sessions';

export class SessionService {
  static start(data: {
    profile_id: string;
    context: string;
    role: string;
    source_modality: SourceType;
    provenance: Provenance;
  }): Session {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session: Session = {
      id,
      profile_id: data.profile_id,
      context: data.context,
      role: data.role,
      source_modality: data.source_modality,
      provenance: data.provenance,
      consent_scope: data.context,
      status: 'ACTIVE',
      started_at: now,
      ended_at: null,
    };
    db.prepare(`
      INSERT INTO sessions (id, profile_id, context, role, source_modality, provenance, consent_scope, status, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(id, data.profile_id, data.context, data.role, data.source_modality, data.provenance, data.context, 'ACTIVE', now);

    EventService.recordEvent({
      event_id: crypto.randomUUID(),
      event_type: 'SESSION_STARTED',
      schema_version: 1,
      occurred_at: now,
      session_id: id,
      profile_id: data.profile_id,
      context: data.context,
      actor: 'SYSTEM',
      actor_role: data.role,
      modality: data.source_modality,
      consent_scope: data.context,
      provenance: data.provenance,
      retention_class: 'DERIVED_EVENT',
      payload_json: JSON.stringify({ source_modality: data.source_modality }),
    });

    return session;
  }

  static end(sessionId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare("UPDATE sessions SET ended_at = ?, status = 'COMPLETED' WHERE id = ?").run(now, sessionId);
  }

  static getById(id: string): Session | undefined {
    return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
  }

  static getTimeline(sessionId: string) {
    return EventService.getEventsBySession(sessionId);
  }

  static getActiveSessions(profileId: string): Session[] {
    return getDb().prepare("SELECT * FROM sessions WHERE profile_id = ? AND status = 'ACTIVE'").all(profileId) as Session[];
  }
}
