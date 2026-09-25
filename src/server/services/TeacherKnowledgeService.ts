// TeacherKnowledgeService.ts — DRAFT→APPROVED→SUPERSEDED/REVOKED versioning
import { getDb } from '../db/connection';
import { EventService } from './EventService';
import type { KnowledgeSource, KnowledgeStatus } from '../../shared/types/knowledge';

export class TeacherKnowledgeService {
  static create(data: Omit<KnowledgeSource, 'source_id' | 'created_at' | 'updated_at' | 'version' | 'status'>): KnowledgeSource {
    const db = getDb();
    const now = new Date().toISOString();
    const source: KnowledgeSource = {
      ...data,
      source_id: crypto.randomUUID(),
      status: 'DRAFT',
      version: 1,
      created_at: now,
      updated_at: now,
    };
    db.prepare(`
      INSERT INTO knowledge_sources (
        source_id, source_class, profile_id, context, intent_id, task_id, author_id, author_role,
        source_title, content, content_type, locale, status, version, supersedes_id,
        session_id, event_id, consent_scope, retention_class, created_at, updated_at
      ) VALUES (
        @source_id, @source_class, @profile_id, @context, @intent_id, @task_id, @author_id, @author_role,
        @source_title, @content, @content_type, @locale, @status, @version, @supersedes_id,
        @session_id, @event_id, @consent_scope, @retention_class, @created_at, @updated_at
      )
    `).run(source);
    return source;
  }

  static approve(sourceId: string, authorId: string): KnowledgeSource {
    const db = getDb();
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM knowledge_sources WHERE source_id = ?').get(sourceId) as KnowledgeSource | undefined;
    if (!existing) throw new Error(`Source ${sourceId} not found`);
    if (existing.status !== 'DRAFT') throw new Error(`Source ${sourceId} is not in DRAFT state (current: ${existing.status})`);
    db.prepare("UPDATE knowledge_sources SET status = 'APPROVED', updated_at = ? WHERE source_id = ?").run(now, sourceId);
    EventService.recordEvent({
      event_id: crypto.randomUUID(), event_type: 'KNOWLEDGE_SOURCE_APPROVED', schema_version: 1,
      occurred_at: now, session_id: null, profile_id: authorId, context: null,
      actor: authorId, actor_role: 'TEACHER', modality: null, consent_scope: 'GLOBAL',
      provenance: 'LIVE', retention_class: 'PERMANENT_AUDIT',
      payload_json: JSON.stringify({ source_id: sourceId }),
    });
    return db.prepare('SELECT * FROM knowledge_sources WHERE source_id = ?').get(sourceId) as KnowledgeSource;
  }

  static supersede(
    oldSourceId: string,
    newData: Omit<KnowledgeSource, 'source_id' | 'created_at' | 'updated_at' | 'version' | 'status'>,
    authorId: string
  ): KnowledgeSource {
    const db = getDb();
    const now = new Date().toISOString();
    const oldSource = db.prepare('SELECT * FROM knowledge_sources WHERE source_id = ?').get(oldSourceId) as KnowledgeSource | undefined;
    if (!oldSource) throw new Error(`Source ${oldSourceId} not found`);
    db.prepare("UPDATE knowledge_sources SET status = 'SUPERSEDED', updated_at = ? WHERE source_id = ?").run(now, oldSourceId);
    const newSource: KnowledgeSource = {
      ...newData,
      source_id: crypto.randomUUID(),
      status: 'DRAFT',
      version: (oldSource.version ?? 1) + 1,
      supersedes_id: oldSourceId,
      created_at: now,
      updated_at: now,
    };
    db.prepare(`
      INSERT INTO knowledge_sources (
        source_id, source_class, profile_id, context, intent_id, task_id, author_id, author_role,
        source_title, content, content_type, locale, status, version, supersedes_id,
        session_id, event_id, consent_scope, retention_class, created_at, updated_at
      ) VALUES (
        @source_id, @source_class, @profile_id, @context, @intent_id, @task_id, @author_id, @author_role,
        @source_title, @content, @content_type, @locale, @status, @version, @supersedes_id,
        @session_id, @event_id, @consent_scope, @retention_class, @created_at, @updated_at
      )
    `).run(newSource);
    EventService.recordEvent({
      event_id: crypto.randomUUID(), event_type: 'KNOWLEDGE_SOURCE_SUPERSEDED', schema_version: 1,
      occurred_at: now, session_id: null, profile_id: authorId, context: null,
      actor: authorId, actor_role: 'TEACHER', modality: null, consent_scope: 'GLOBAL',
      provenance: 'LIVE', retention_class: 'PERMANENT_AUDIT',
      payload_json: JSON.stringify({ old_source_id: oldSourceId, new_source_id: newSource.source_id }),
    });
    return newSource;
  }

  static revoke(sourceId: string, authorId: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare("UPDATE knowledge_sources SET status = 'REVOKED', updated_at = ? WHERE source_id = ?").run(now, sourceId);
    EventService.recordEvent({
      event_id: crypto.randomUUID(), event_type: 'KNOWLEDGE_SOURCE_REVOKED', schema_version: 1,
      occurred_at: now, session_id: null, profile_id: authorId, context: null,
      actor: authorId, actor_role: 'TEACHER', modality: null, consent_scope: 'GLOBAL',
      provenance: 'LIVE', retention_class: 'PERMANENT_AUDIT',
      payload_json: JSON.stringify({ source_id: sourceId }),
    });
  }

  static getForProfile(profileId: string, statuses: KnowledgeStatus[] = ['DRAFT', 'APPROVED', 'ACTIVE']): KnowledgeSource[] {
    const placeholders = statuses.map(() => '?').join(',');
    return getDb().prepare(
      `SELECT * FROM knowledge_sources WHERE profile_id = ? AND status IN (${placeholders}) ORDER BY created_at DESC`
    ).all(profileId, ...statuses) as KnowledgeSource[];
  }

  static getAll(statuses?: KnowledgeStatus[]): KnowledgeSource[] {
    if (statuses) {
      const placeholders = statuses.map(() => '?').join(',');
      return getDb().prepare(`SELECT * FROM knowledge_sources WHERE status IN (${placeholders}) ORDER BY created_at DESC`).all(...statuses) as KnowledgeSource[];
    }
    return getDb().prepare('SELECT * FROM knowledge_sources ORDER BY created_at DESC').all() as KnowledgeSource[];
  }

  static getById(sourceId: string): KnowledgeSource | undefined {
    return getDb().prepare('SELECT * FROM knowledge_sources WHERE source_id = ?').get(sourceId) as KnowledgeSource | undefined;
  }
}
