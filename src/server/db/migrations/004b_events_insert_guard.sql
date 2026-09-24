-- 004b_events_insert_guard.sql
-- SECURITY FIX: Plug INSERT OR REPLACE bypass of append-only events guarantee.
-- SQLite's INSERT OR REPLACE internally executes DELETE + INSERT, which bypasses
-- the BEFORE UPDATE trigger. This BEFORE INSERT trigger checks that no existing
-- row shares the same event_id before allowing the insert to proceed.
CREATE TRIGGER IF NOT EXISTS prevent_events_overwrite_on_insert
  BEFORE INSERT ON events
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM events WHERE event_id = NEW.event_id
    )
    THEN RAISE(ABORT, 'Violation: events table is append-only. Duplicate event_id insert is forbidden.')
  END;
END;
