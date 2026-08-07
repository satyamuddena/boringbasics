"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { str, num, bool, lines, slugify, uniqueSlug } from "@/lib/forms";
import { upsertPromoBanner, deletePromoFor } from "@/lib/promoBanner";

function parse(formData: FormData) {
  const title = str(formData, "title");
  return {
    // Always normalised — see the same guard in posts/actions.ts.
    slug: slugify(str(formData, "slug") || title),
    title,
    durationLabel: str(formData, "durationLabel"),
    shortDescription: str(formData, "shortDescription"),
    fullDescription: str(formData, "fullDescription"),
    featuresJson: lines(formData, "features"),
    goalTagsJson: JSON.stringify(formData.getAll("goalTags").map(String)),
    price: num(formData, "price"),
    currency: str(formData, "currency") || "INR",
    billingPeriod: str(formData, "billingPeriod") || "one-time",
    popular: bool(formData, "popular"),
    displayOrder: num(formData, "displayOrder"),
    image: str(formData, "image"),
  };
}

export async function saveProgramAction(formData: FormData) {
  const db = getDb();
  const id = num(formData, "id", 0);
  const values = parse(formData);
  // programs.slug is UNIQUE — resolve collisions before hitting the constraint.
  values.slug = uniqueSlug(values.slug, (candidate) => {
    const row = db
      .select({ id: t.programs.id })
      .from(t.programs)
      .where(eq(t.programs.slug, candidate))
      .get();
    return !!row && row.id !== id;
  });

  if (id) {
    await auditedMutation({
      action: "update",
      entityType: "program",
      before: () => db.select().from(t.programs).where(eq(t.programs.id, id)).get(),
      run: () => db.update(t.programs).set(values).where(eq(t.programs.id, id)).run(),
      entityId: () => id,
      after: () => db.select().from(t.programs).where(eq(t.programs.id, id)).get(),
    });
    upsertPromoBanner("program", id, formData);
  } else {
    const result = await auditedMutation({
      action: "create",
      entityType: "program",
      run: () => db.insert(t.programs).values(values).run(),
      entityId: (r) => Number(r.lastInsertRowid),
      after: (r) =>
        db.select().from(t.programs).where(eq(t.programs.id, Number(r.lastInsertRowid))).get(),
    });
    upsertPromoBanner("program", Number(result.lastInsertRowid), formData);
  }
  redirect("/admin/programs");
}

export async function deleteProgramAction(id: number) {
  const db = getDb();
  if (!id) return;
  await auditedMutation({
    action: "delete",
    entityType: "program",
    before: () => db.select().from(t.programs).where(eq(t.programs.id, id)).get(),
    run: () => db.delete(t.programs).where(eq(t.programs.id, id)).run(),
    entityId: () => id,
  });
  deletePromoFor("program", id);
  redirect("/admin/programs");
}
