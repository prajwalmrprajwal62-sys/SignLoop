export const SourceClass = {
  TEACHER_KNOWLEDGE: 'TEACHER_KNOWLEDGE',
  STUDENT_EVIDENCE: 'STUDENT_EVIDENCE',
  APPROVED_TRAINING: 'APPROVED_TRAINING',
} as const;
export type SourceClass = typeof SourceClass[keyof typeof SourceClass];
// CRITICAL: These are the ONLY three allowed source classes for RAG retrieval

export const KnowledgeStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  REVOKED: 'REVOKED',
} as const;
export type KnowledgeStatus = typeof KnowledgeStatus[keyof typeof KnowledgeStatus];

export interface KnowledgeSource {
  source_id: string;
  source_class: SourceClass;
  profile_id: string | null;
  context: string | null;
  intent_id: string | null;
  task_id: string | null;
  author_id: string | null;
  author_role: string | null;
  source_title: string | null;
  content: string;
  content_type: string;
  locale: string;
  status: KnowledgeStatus;
  version: number;
  supersedes_id: string | null;
  session_id: string | null;
  event_id: string | null;
  consent_scope: string;
  retention_class: string;
  created_at: string;
  updated_at: string;
}
