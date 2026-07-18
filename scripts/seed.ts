/**
 * Seeds the SQLite database with the bundled defaults from src/content/site.ts
 * and creates the admin user from ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * Idempotent: only fills tables that are empty; never overwrites edits.
 * Seeding also runs automatically on first app boot, so this script is only
 * needed to initialize a database ahead of starting the server.
 *
 * Usage: npx tsx scripts/seed.ts
 */
import { getDb, dataDir } from "@/db";

getDb(); // opens the DB, runs migrations, and seeds empty tables
console.info(`[seed] done — database at ${dataDir()}/boring-basics.db`);
