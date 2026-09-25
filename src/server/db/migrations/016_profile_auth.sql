-- 016_profile_auth.sql: Add optional PIN hash for local profile authentication
ALTER TABLE profiles ADD COLUMN pin_hash TEXT;
