"use server";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { str } from "@/lib/forms";
import { sendTwilioWhatsAppBooking } from "@/lib/whatsapp";

export async function sendWhatsAppTestAction(formData: FormData) {
  const admin = await requireAdmin();
  const recipient = str(formData, "recipient").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) redirect("/admin/whatsapp-test?error=phone");
  const result = await sendTwilioWhatsAppBooking(recipient, { name: "John Doe", whatsapp: "+91XXXXXXXXXX", email: "john@email.com", bookedAt: "2026-07-20T18:00:00+05:30" });
  audit({ actor: admin.email, action: "whatsapp_test", entityType: "twilio_whatsapp", after: { recipient, ok: result.ok, sid: result.sid, error: result.error }, ...(await requestMeta()) });
  redirect(result.ok ? "/admin/whatsapp-test?sent=1" : "/admin/whatsapp-test?error=send");
}
