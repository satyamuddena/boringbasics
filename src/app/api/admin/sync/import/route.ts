import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { requestMeta } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getDb, schema as t } from "@/db";
import type Database from "better-sqlite3";

const SINGLETON_TABLES = ["trainer", "consultation", "siteSettings"] as const;
const LIST_TABLES = ["stats", "programs", "testimonials", "faqs", "socials"] as const;
const MAX_IMPORT_BYTES = 1024 * 1024; // content exports are small; reject oversized uploads

const tableMap = {
  trainer: t.trainer,
  stats: t.stats,
  programs: t.programs,
  testimonials: t.testimonials,
  faqs: t.faqs,
  socials: t.socials,
  consultation: t.consultation,
  siteSettings: t.siteSettings,
} as const;

const allowedTables = new Set<string>([...SINGLETON_TABLES, ...LIST_TABLES]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateImportTables(tables: Record<string, unknown>): string | null {
  for (const key of Object.keys(tables)) {
    if (!allowedTables.has(key)) return `Unsupported table "${key}"`;
  }

  for (const key of SINGLETON_TABLES) {
    const row = tables[key];
    if (row != null && !isPlainRecord(row)) return `"${key}" must be an object or null`;
  }

  for (const key of LIST_TABLES) {
    const rows = tables[key];
    if (rows == null) continue;
    if (!Array.isArray(rows)) return `"${key}" must be an array`;
    if (rows.length > 500) return `"${key}" has too many rows`;
    if (!rows.every(isPlainRecord)) return `"${key}" rows must be objects`;
  }

  return null;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json({ error: "Import file is too large" }, { status: 400 });
  }

  let data: { version?: number; tables?: Record<string, unknown> };
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
  }

  if (data.version !== 1 || !data.tables || typeof data.tables !== "object") {
    return NextResponse.json(
      { error: "Invalid export file: must have version 1 and a tables object" },
      { status: 400 },
    );
  }
  const validationError = validateImportTables(data.tables);
  if (validationError) {
    return NextResponse.json({ error: `Invalid export file: ${validationError}` }, { status: 400 });
  }

  const db = getDb();

  // Wrap in a transaction so a failure mid-import doesn't leave data half-replaced.
  // `better-sqlite3`'s default export is a namespace/constructor; the instance
  // type is `Database.Database`.
  const sqliteDb = (db as unknown as { $client: Database.Database }).$client;
  sqliteDb.transaction(() => {
    // Process singletons — delete where id=1, then insert
    for (const key of SINGLETON_TABLES) {
      const row = data.tables![key];
      if (row && typeof row === "object") {
        const table = tableMap[key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.delete(table).where(eq((table as any).id, 1)).run();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.insert(table).values(row as any).run();
      }
    }

    // Process list tables — delete all, then insert array
    for (const key of LIST_TABLES) {
      const rows = data.tables![key];
      if (Array.isArray(rows) && rows.length > 0) {
        const table = tableMap[key];
        db.delete(table).run();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.insert(table).values(rows as any).run();
      } else if (Array.isArray(rows) && rows.length === 0) {
        db.delete(tableMap[key]).run();
      }
    }
  })();

  const meta = await requestMeta();
  audit({
    actor: admin.email,
    action: "update",
    entityType: "sync_import",
    after: { tables: Object.keys(data.tables) },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
