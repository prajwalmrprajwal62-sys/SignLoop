-- 012a_knowledge_sources_fts.sql: FTS5 virtual table & 3-way synchronization triggers
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_sources_fts USING fts5(
  source_id UNINDEXED,
  content,
  intent_id,
  source_class UNINDEXED,
  profile_id UNINDEXED,
  status UNINDEXED,
  content='knowledge_sources',
  content_rowid='rowid'
);

-- Trigger 1: Sync on INSERT
CREATE TRIGGER IF NOT EXISTS knowledge_sources_ai AFTER INSERT ON knowledge_sources BEGIN
  INSERT INTO knowledge_sources_fts(rowid, source_id, content, intent_id, source_class, profile_id, status)
  VALUES (new.rowid, new.source_id, new.content, new.intent_id, new.source_class, new.profile_id, new.status);
END;

-- Trigger 2: Sync on DELETE
CREATE TRIGGER IF NOT EXISTS knowledge_sources_ad AFTER DELETE ON knowledge_sources BEGIN
  INSERT INTO knowledge_sources_fts(knowledge_sources_fts, rowid, source_id, content, intent_id, source_class, profile_id, status)
  VALUES('delete', old.rowid, old.source_id, old.content, old.intent_id, old.source_class, old.profile_id, old.status);
END;

-- Trigger 3: Sync on UPDATE
CREATE TRIGGER IF NOT EXISTS knowledge_sources_au AFTER UPDATE ON knowledge_sources BEGIN
  INSERT INTO knowledge_sources_fts(knowledge_sources_fts, rowid, source_id, content, intent_id, source_class, profile_id, status)
  VALUES('delete', old.rowid, old.source_id, old.content, old.intent_id, old.source_class, old.profile_id, old.status);
  INSERT INTO knowledge_sources_fts(rowid, source_id, content, intent_id, source_class, profile_id, status)
  VALUES (new.rowid, new.source_id, new.content, new.intent_id, new.source_class, new.profile_id, new.status);
END;
