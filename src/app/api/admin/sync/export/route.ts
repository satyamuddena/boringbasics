import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema as t } from "@/db";

export async function GET() {
  await requireAdmin();

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const tables = {
    trainer: db.select().from(t.trainer).where(eq(t.trainer.id, 1)).get() ?? null,
    stats: db.select().from(t.stats).orderBy(asc(t.stats.displayOrder)).all(),
    programs: db.select().from(t.programs).orderBy(asc(t.programs.displayOrder)).all(),
    testimonials: db.select().from(t.testimonials).orderBy(asc(t.testimonials.displayOrder)).all(),
    faqs: db.select().from(t.faqs).orderBy(asc(t.faqs.displayOrder)).all(),
    socials: db.select().from(t.socials).orderBy(asc(t.socials.displayOrder)).all(),
    consultation: db.select().from(t.consultation).where(eq(t.consultation.id, 1)).get() ?? null,
    siteSettings: db.select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get() ?? null,
  };

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=boring-basics-content-${today}.json`,
    },
  });
}
