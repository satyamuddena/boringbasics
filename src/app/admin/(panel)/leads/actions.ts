"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { syncCalendlyEvent } from "@/lib/calendlySync";
import { getTwilioWhatsAppStatus } from "@/lib/whatsapp";

export async function setLeadStatusAction(id: number, status: "new" | "contacted" | "closed") {
  const db = getDb();
  if (!id) return;
  await auditedMutation({
    action: "update",
    entityType: "lead",
    before: () => db.select().from(t.leads).where(eq(t.leads.id, id)).get(),
    run: () =>
      db
        .update(t.leads)
        .set(status === "contacted" ? { status, contactedAt: new Date().toISOString() } : { status })
        .where(eq(t.leads.id, id))
        .run(),
    entityId: () => id,
    after: () => db.select().from(t.leads).where(eq(t.leads.id, id)).get(),
  });
  redirect("/admin/leads");
}

/**
 * Fired when the trainer opens a lead's WhatsApp chat. Opening the chat *is*
 * the act of contacting them, so asking them to also press a button afterwards
 * only records what we already watched happen.
 *
 * Always refreshes the timestamp — "when did I last message them" is the useful
 * fact — but never drags a closed booking back open.
 */
export async function markContactedAction(id: number) {
  const db = getDb();
  if (!id) return;
  const lead = db.select().from(t.leads).where(eq(t.leads.id, id)).get();
  if (!lead || lead.status === "closed") return;
  await auditedMutation({
    action: "update",
    entityType: "lead",
    before: () => lead,
    run: () =>
      db
        .update(t.leads)
        .set({ status: "contacted", contactedAt: new Date().toISOString() })
        .where(eq(t.leads.id, id))
        .run(),
    entityId: () => id,
    after: () => db.select().from(t.leads).where(eq(t.leads.id, id)).get(),
  });
  revalidatePath("/admin/leads");
}

/**
 * Ask Calendly what this slot looks like now. Calendly never tells us about a
 * cancellation or a reschedule, so this is the only way an admin can find out.
 */
export async function refreshCalendlySlotAction(leadId: number) {
  const admin = await requireAdmin();
  if (!leadId) return;
  const status = await syncCalendlyEvent(leadId);
  audit({
    actor: admin.email,
    action: "calendly_slot_refresh",
    entityType: "lead",
    entityId: leadId,
    after: { status },
    ...(await requestMeta()),
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
