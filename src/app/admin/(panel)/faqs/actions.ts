"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { str, num } from "@/lib/forms";

function parse(formData: FormData) {
  return {
    question: str(formData, "question"),
    answer: str(formData, "answer"),
    category: str(formData, "category") || "General",
    displayOrder: num(formData, "displayOrder"),
  };
}

export async function saveFaqAction(formData: FormData) {
  const db = getDb();
  const id = num(formData, "id", 0);
  const values = parse(formData);
  if (id) {
    await auditedMutation({
      action: "update",
      entityType: "faq",
      before: () => db.select().from(t.faqs).where(eq(t.faqs.id, id)).get(),
      run: () => db.update(t.faqs).set(values).where(eq(t.faqs.id, id)).run(),
      entityId: () => id,
      after: () => db.select().from(t.faqs).where(eq(t.faqs.id, id)).get(),
    });
  } else {
    await auditedMutation({
      action: "create",
      entityType: "faq",
      run: () => db.insert(t.faqs).values(values).run(),
      entityId: (r) => Number(r.lastInsertRowid),
      after: (r) => db.select().from(t.faqs).where(eq(t.faqs.id, Number(r.lastInsertRowid))).get(),
    });
  }
  redirect("/admin/faqs");
}

export async function deleteFaqAction(id: number) {
  const db = getDb();
  if (!id) return;
  await auditedMutation({
    action: "delete",
    entityType: "faq",
    before: () => db.select().from(t.faqs).where(eq(t.faqs.id, id)).get(),
    run: () => db.delete(t.faqs).where(eq(t.faqs.id, id)).run(),
    entityId: () => id,
  });
  redirect("/admin/faqs");
}
