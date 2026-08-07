"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { str, num, bool } from "@/lib/forms";
import { upsertPromoBanner, deletePromoFor } from "@/lib/promoBanner";

function parse(formData: FormData) {
  return {
    clientName: str(formData, "clientName"),
    image: str(formData, "image") || null,
    quote: str(formData, "quote"),
    rating: Math.min(5, Math.max(1, num(formData, "rating", 5))),
    result: str(formData, "result") || null,
    featured: bool(formData, "featured"),
    placeholder: false,
    displayOrder: num(formData, "displayOrder"),
  };
}

export async function saveTestimonialAction(formData: FormData) {
  const db = getDb();
  const id = num(formData, "id", 0);
  const values = parse(formData);
  if (id) {
    await auditedMutation({
      action: "update",
      entityType: "testimonial",
      before: () => db.select().from(t.testimonials).where(eq(t.testimonials.id, id)).get(),
      run: () => db.update(t.testimonials).set(values).where(eq(t.testimonials.id, id)).run(),
      entityId: () => id,
      after: () => db.select().from(t.testimonials).where(eq(t.testimonials.id, id)).get(),
    });
    upsertPromoBanner("testimonial", id, formData);
  } else {
    const result = await auditedMutation({
      action: "create",
      entityType: "testimonial",
      run: () => db.insert(t.testimonials).values(values).run(),
      entityId: (r) => Number(r.lastInsertRowid),
      after: (r) =>
        db.select().from(t.testimonials).where(eq(t.testimonials.id, Number(r.lastInsertRowid))).get(),
    });
    upsertPromoBanner("testimonial", Number(result.lastInsertRowid), formData);
  }
  revalidatePath("/");
  revalidatePath("/testimonials");
  redirect("/admin/testimonials");
}

export async function deleteTestimonialAction(id: number) {
  const db = getDb();
  if (!id) return;
  await auditedMutation({
    action: "delete",
    entityType: "testimonial",
    before: () => db.select().from(t.testimonials).where(eq(t.testimonials.id, id)).get(),
    run: () => db.delete(t.testimonials).where(eq(t.testimonials.id, id)).run(),
    entityId: () => id,
  });
  deletePromoFor("testimonial", id);
  revalidatePath("/");
  revalidatePath("/testimonials");
  redirect("/admin/testimonials");
}
