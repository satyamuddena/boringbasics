import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { ensureSeeded } from "./seed";

export type Db = BetterSQLite3Database<typeof schema>;

/** All persistent state (DB + uploads) lives under DATA_DIR — one Docker volume. */
export function dataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data");
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}

/**
 * Migrations folder must exist at runtime (copied into the Docker image).
 * In dev it's the repo-root ./drizzle directory.
 */
function migrationsFolder(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle");
}

// Survive Next.js dev-mode HMR: keep the handle on globalThis.
const globalForDb = globalThis as unknown as { __boringBasicsDb?: Db };

function openDb(): Db {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(uploadsDir(), { recursive: true });

  const sqlite = new Database(path.join(dir, "boring-basics.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsFolder() });
  ensureSeeded(db);
  return db;
}

export function getDb(): Db {
  if (!globalForDb.__boringBasicsDb) {
    globalForDb.__boringBasicsDb = openDb();
  }
  return globalForDb.__boringBasicsDb;
}

export { schema };
