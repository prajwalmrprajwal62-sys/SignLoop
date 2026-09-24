-- 001_profiles.sql: Pseudonymous identity records across roles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  pseudonymous_code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('STUDENT','TEACHER','STAFF','ADMIN')),
  preferred_locale TEXT DEFAULT 'en-IN',
  visibility_status TEXT NOT NULL CHECK(visibility_status IN ('ACTIVE','ARCHIVED','DELETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_code ON profiles(pseudonymous_code);
