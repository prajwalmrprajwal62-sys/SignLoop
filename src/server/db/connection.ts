import Database, { Database as DatabaseInstance } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: DatabaseInstance | null = null;

export interface DbConfig {
  dbPath?: string;
  verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
}

/**
 * Resolves the default SQLite database path.
 * Precedence: DB_PATH env > DATABASE_URL env > [projectRoot]/data/signloop.db
 */
export function getDbPath(): string {
  if (process.env.DB_PATH) {
    return path.resolve(process.cwd(), process.env.DB_PATH);
  }
  if (process.env.DATABASE_URL) {
    const raw = process.env.DATABASE_URL.replace(/^sqlite:\/\//, '');
    return path.resolve(process.cwd(), raw);
  }
  return path.resolve(process.cwd(), 'data', 'signloop.db');
}

/**
 * Initializes and configures the singleton better-sqlite3 connection.
 */
export function getDb(config?: DbConfig): DatabaseInstance {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }

  const resolvedPath = config?.dbPath ?? getDbPath();
  const dbDir = path.dirname(resolvedPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(resolvedPath, {
    verbose: config?.verbose ?? (process.env.DEBUG_SQL === 'true' ? console.log : undefined)
  });

  // Configure SQLite performance and integrity pragmas
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('busy_timeout = 5000');

  return dbInstance;
}

/**
 * Gracefully closes the database connection.
 */
export function closeDb(): void {
  if (dbInstance && dbInstance.open) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Register process exit listeners for clean SQLite teardown
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

export default getDb;
