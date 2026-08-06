"use server";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { str } from "@/lib/forms";
import { getConsultation, getTrainer } from "@/lib/content";
import { getTwilioWhatsAppStatus, sendTwilioWhatsAppBooking, sendTwilioWhatsAppCustomer } from "@/lib/whatsapp";

export async function sendWhatsAppTestAction(formData: FormData) {
  const admin = await requireAdmin();
  const recipient = str(formData, "recipient").trim();
  const audience = str(formData, "audience") === "customer" ? "customer" : "trainer";
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) redirect(`/admin/whatsapp-test?error=phone&audience=${audience}`);
  const [trainer, consultation] = await Promise.all([getTrainer(), getConsultation()]);
  const sample = {
    name: "John Doe",
    whatsapp: "+91XXXXXXXXXX",
    email: "john@email.com",
    bookedAt: "2026-07-20T18:00:00+05:30",
    scheduledAt: "2026-07-20T18:00:00+05:30",
    brand: trainer.brand,
    durationLabel: consultation.durationLabel,
  };
  const result =
    audience === "customer"
      ? await sendTwilioWhatsAppCustomer(recipient, sample)
      : await sendTwilioWhatsAppBooking(recipient, sample);
  audit({ actor: admin.email, action: "whatsapp_test", entityType: "twilio_whatsapp", after: { audience, recipient, ok: result.ok, sid: result.sid, errorCode: result.errorCode, error: result.error }, ...(await requestMeta()) });
  if (!result.ok) redirect(`/admin/whatsapp-test?error=send&audience=${audience}&message=${encodeURIComponent(result.error ?? "Twilio rejected the message.")}`);
  const params = new URLSearchParams({ sent: "1", audience });
  if (result.sid) params.set("sid", result.sid);
  if (result.status) params.set("status", result.status);
  redirect(`/admin/whatsapp-test?${params}`);
}

export async function checkWhatsAppStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const sid = str(formData, "sid");
  const audience = str(formData, "audience") === "customer" ? "customer" : "trainer";
  const result = await getTwilioWhatsAppStatus(sid);
  audit({ actor: admin.email, action: "whatsapp_status_check", entityType: "twilio_whatsapp", entityId: sid, after: result, ...(await requestMeta()) });
  const params = new URLSearchParams({ checked: "1", sid, audience });
  if (result.status) params.set("status", result.status);
  if (result.errorCode != null) params.set("code", String(result.errorCode));
  if (result.error) params.set("message", result.error);
  if (!result.ok) params.set("error", "status");
  redirect(`/admin/whatsapp-test?${params}`);
}
