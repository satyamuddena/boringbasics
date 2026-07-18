"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";

export async function setLeadStatusAction(id: number, status: "new" | "contacted" | "closed") {
  const db = getDb();
  if (!id) return;
  await auditedMutation({
    action: "update",
    entityType: "lead",
    before: () => db.select().from(t.leads).where(eq(t.leads.id, id)).get(),
    run: () => db.update(t.leads).set({ status }).where(eq(t.leads.id, id)).run(),
    entityId: () => id,
    after: () => db.select().from(t.leads).where(eq(t.leads.id, id)).get(),
  });
  redirect("/admin/leads");
}
