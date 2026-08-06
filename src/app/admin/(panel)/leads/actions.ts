"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { getTwilioWhatsAppStatus } from "@/lib/whatsapp";

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

/**
 * Twilio's send response only means "accepted" — this asks for the actual
 * delivery receipt of a booking notification we already sent.
 */
export async function checkBookingWhatsAppAction(sid: string, leadId: number) {
  const admin = await requireAdmin();
  const result = await getTwilioWhatsAppStatus(sid);
  audit({
    actor: admin.email,
    action: "whatsapp_status_check",
    entityType: "lead",
    entityId: leadId,
    after: result,
    ...(await requestMeta()),
  });
  const params = new URLSearchParams({ waLead: String(leadId) });
  if (result.status) params.set("waStatus", result.status);
  if (result.errorCode != null) params.set("waCode", String(result.errorCode));
  if (result.error) params.set("waMessage", result.error);
  redirect(`/admin/leads?${params}`);
}
