"use server";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { str } from "@/lib/forms";
import { getTwilioWhatsAppStatus, sendTwilioWhatsAppBooking } from "@/lib/whatsapp";

export async function sendWhatsAppTestAction(formData: FormData) {
  const admin = await requireAdmin();
  const recipient = str(formData, "recipient").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) redirect("/admin/whatsapp-test?error=phone");
  const result = await sendTwilioWhatsAppBooking(recipient, { name: "John Doe", whatsapp: "+91XXXXXXXXXX", email: "john@email.com", bookedAt: "2026-07-20T18:00:00+05:30" });
  audit({ actor: admin.email, action: "whatsapp_test", entityType: "twilio_whatsapp", after: { recipient, ok: result.ok, sid: result.sid, error: result.error }, ...(await requestMeta()) });
  if (!result.ok) redirect(`/admin/whatsapp-test?error=send&message=${encodeURIComponent(result.error ?? "Twilio rejected the message.")}`);
  const params = new URLSearchParams({ sent: "1" });
  if (result.sid) params.set("sid", result.sid);
  if (result.status) params.set("status", result.status);
  redirect(`/admin/whatsapp-test?${params}`);
}

export async function checkWhatsAppStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const sid = str(formData, "sid");
  const result = await getTwilioWhatsAppStatus(sid);
  audit({ actor: admin.email, action: "whatsapp_status_check", entityType: "twilio_whatsapp", entityId: sid, after: result, ...(await requestMeta()) });
  const params = new URLSearchParams({ checked: "1", sid });
  if (result.status) params.set("status", result.status);
  if (result.errorCode != null) params.set("code", String(result.errorCode));
  if (result.error) params.set("message", result.error);
  if (!result.ok) params.set("error", "status");
  redirect(`/admin/whatsapp-test?${params}`);
}
