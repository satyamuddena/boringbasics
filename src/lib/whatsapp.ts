import "server-only";
import { Buffer } from "node:buffer";

export interface BookingWhatsAppPayload { name: string; whatsapp: string; email: string | null; bookedAt: string; }
export interface WhatsAppSendResult { ok: boolean; sid?: string; status?: string; errorCode?: number; error?: string; }

type TwilioMessageResponse = {
  sid?: string;
  status?: string;
  message?: string;
  error_code?: number | null;
  error_message?: string | null;
};

function cleanPhone(value?: string | null) { return value?.replace(/\D/g, "") ?? ""; }
function bookingDateAndTime(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(date),
    time: new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(date).replace(/\b(am|pm)\b/i, (value) => value.toUpperCase()),
  };
}

/** Approved Content Template variables: {{1}} name, {{2}} phone, {{3}} date, {{4}} time, {{5}} email. */
export async function sendTwilioWhatsAppBooking(to: string, booking: BookingWhatsAppPayload): Promise<WhatsAppSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();
  const recipient = cleanPhone(to);
  if (!accountSid || !authToken || !from || !contentSid) return { ok: false, error: "Twilio WhatsApp environment variables are incomplete." };
  if (!recipient) return { ok: false, error: "A valid WhatsApp recipient is required." };
  const { date, time } = bookingDateAndTime(booking.bookedAt);
  const form = new URLSearchParams({ From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`, To: `whatsapp:+${recipient}`, ContentSid: contentSid, ContentVariables: JSON.stringify({ "1": booking.name, "2": booking.whatsapp, "3": date, "4": time, "5": booking.email || "—" }) });
  try {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(), signal: controller.signal });
    clearTimeout(timeout);
    const data = (await response.json().catch(() => null)) as TwilioMessageResponse | null;
    if (!response.ok) { console.error("[whatsapp] Twilio notification failed:", response.status, data?.message); return { ok: false, error: data?.message || "Twilio rejected the message." }; }
    return { ok: true, sid: data?.sid, status: data?.status };
  } catch (error) { console.error("[whatsapp] Twilio notification error:", error); return { ok: false, error: "Unable to contact Twilio. Please try again." }; }
}

/** Reads Twilio's latest delivery receipt for a previously submitted message. */
export async function getTwilioWhatsAppStatus(sid: string): Promise<WhatsAppSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) return { ok: false, error: "Twilio credentials are incomplete." };
  if (!/^(SM|MM)[0-9a-f]{32}$/i.test(sid)) return { ok: false, error: "Invalid Twilio message SID." };
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(sid)}.json`,
      { headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` }, cache: "no-store" },
    );
    const data = (await response.json().catch(() => null)) as TwilioMessageResponse | null;
    if (!response.ok) return { ok: false, sid, error: data?.message || "Unable to read Twilio delivery status." };
    return {
      ok: true,
      sid,
      status: data?.status,
      errorCode: data?.error_code ?? undefined,
      error: data?.error_message ?? undefined,
    };
  } catch (error) {
    console.error("[whatsapp] Twilio status lookup error:", error);
    return { ok: false, sid, error: "Unable to contact Twilio. Please try again." };
  }
}
