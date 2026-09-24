import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from './connection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationResult {
  name: string;
  applied: boolean;
  timestamp?: string;
  error?: string;
}

/**
 * Locates the migrations directory.
 */
export function getMigrationsDir(): string {
  const localDir = path.resolve(__dirname, 'migrations');
  if (fs.existsSync(localDir)) {
    return localDir;
  }
  const rootSrcDir = path.resolve(process.cwd(), 'src', 'server', 'db', 'migrations');
  if (fs.existsSync(rootSrcDir)) {
    return rootSrcDir;
  }
  throw new Error(`Migrations directory not found at ${localDir} or ${rootSrcDir}`);
}

/**
 * Initializes the _migrations tracking table.
 */
export function initMigrationsTable(db = getDb()): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

/**
 * Retrieves the list of already applied migration names.
 */
export function getAppliedMigrations(db = getDb()): string[] {
  initMigrationsTable(db);
  const rows = db.prepare('SELECT name FROM _migrations ORDER BY id ASC').all() as { name: string }[];
  return rows.map((r) => r.name);
}

/**
 * Runs all pending migrations in sequential order.
 */
export function runMigrations(options: { dbPath?: string; silent?: boolean } = {}): MigrationResult[] {
  const db = getDb({ dbPath: options.dbPath });
  const migrationsDir = getMigrationsDir();
  initMigrationsTable(db);

  const applied = new Set(getAppliedMigrations(db));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const results: MigrationResult[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      if (!options.silent) {
        console.log(`[db:migrate] Skipping already applied migration: ${file}`);
      }
      results.push({ name: file, applied: false });
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    if (!options.silent) {
      console.log(`[db:migrate] Executing migration: ${file}...`);
    }

    const executeMigration = db.transaction(() => {
      // Execute migration DDL
      db.exec(sqlContent);
      // Record in _migrations table
      const now = new Date().toISOString();
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, now);
      return now;
    });

    try {
      const timestamp = executeMigration();
      if (!options.silent) {
        console.log(`[db:migrate] Successfully applied: ${file} at ${timestamp}`);
      }
      results.push({ name: file, applied: true, timestamp });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[db:migrate] FAILED on migration: ${file}\nError: ${errorMessage}`);
      results.push({ name: file, applied: false, error: errorMessage });
      throw new Error(`Migration ${file} failed: ${errorMessage}`);
    }
  }

  return results;
}

/**
 * Resets the entire database by dropping all tables, views, and triggers.
 */
export function resetDb(options: { dbPath?: string; silent?: boolean } = {}): void {
  const db = getDb({ dbPath: options.dbPath });

  if (!options.silent) {
    console.log('[db:reset] Dropping existing schema objects...');
  }

  // Disable foreign keys temporarily during drop
  db.pragma('foreign_keys = OFF');

  db.transaction(() => {
    // Drop all triggers
    const triggers = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    for (const { name } of triggers) {
      try {
        db.exec(`DROP TRIGGER IF EXISTS "${name}"`);
      } catch {
        // Ignored if dropped with parent table
      }
    }

    // Drop all views
    const views = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'view' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    for (const { name } of views) {
      try {
        db.exec(`DROP VIEW IF EXISTS "${name}"`);
      } catch {
        // Ignored
      }
    }

    // Drop virtual tables first if present
    const virtualTables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE '%VIRTUAL TABLE%'")
      .all() as { name: string }[];
    for (const { name } of virtualTables) {
      try {
        db.exec(`DROP TABLE IF EXISTS "${name}"`);
      } catch {
        // Ignored
      }
    }

    // Drop remaining tables
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    for (const { name } of tables) {
      try {
        db.exec(`DROP TABLE IF EXISTS "${name}"`);
      } catch {
        // Ignored
      }
    }
  })();

  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');

  if (!options.silent) {
    console.log('[db:reset] All database objects dropped successfully.');
  }
}

// CLI execution handling
const isDirectExecution = process.argv[1] && (
  process.argv[1] === __filename ||
  process.argv[1].endsWith('migrate.ts') ||
  process.argv[1].endsWith('migrate.js')
);

if (isDirectExecution) {
  const isReset = process.argv.includes('--reset');
  try {
    if (isReset) {
      resetDb();
      console.log('[db:reset] Re-running all migrations after reset...');
    }
    runMigrations();
    console.log('[db:migrate] All migrations applied successfully.');
    closeDb();
    process.exit(0);
  } catch (error) {
    console.error('[db:migrate] Process terminated with error:', error);
    closeDb();
    process.exit(1);
  }
}
