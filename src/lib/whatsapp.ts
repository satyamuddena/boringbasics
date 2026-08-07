import "server-only";
import { Buffer } from "node:buffer";
import { isValidPhoneNumber } from "libphonenumber-js";
import {
  customerTemplateVariables,
  normaliseWhatsAppDigits,
  trainerTemplateVariables,
  type BookingWhatsAppPayload,
} from "./whatsappTemplate";

export type { BookingWhatsAppPayload };

export interface WhatsAppSendResult {
  ok: boolean;
  sid?: string;
  status?: string;
  errorCode?: number;
  error?: string;
}

/** E.164 digits for Twilio, or null when the number is unusable. */
function toWhatsAppRecipient(raw: string | null | undefined): string | null {
  const digits = normaliseWhatsAppDigits(raw);
  if (!digits) return null;
  return isValidPhoneNumber(`+${digits}`) ? digits : null;
}

type TwilioMessageResponse = {
  sid?: string;
  status?: string;
  message?: string;
  code?: number | null;
  error_code?: number | null;
  error_message?: string | null;
};

/**
 * Submits one approved Content Template to Twilio. Never throws — a failed
 * notification must not disturb the booking it is reporting on, so every
 * outcome comes back as a result the caller can audit.
 */
async function sendTwilioTemplate(
  to: string,
  contentSid: string | undefined,
  variables: Record<string, string>,
): Promise<WhatsAppSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "Twilio WhatsApp environment variables are incomplete." };
  }
  if (!contentSid) {
    return { ok: false, error: "No Twilio Content SID is configured for this message." };
  }

  const recipient = toWhatsAppRecipient(to);
  if (!recipient) {
    // Caught here rather than by Twilio (error 21211), which bills the attempt
    // and reports it far less clearly.
    return { ok: false, error: `Not a valid WhatsApp number: ${to || "(empty)"}` };
  }

  const form = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: `whatsapp:+${recipient}`,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    const data = (await response.json().catch(() => null)) as TwilioMessageResponse | null;
    if (!response.ok) {
      const errorCode = data?.code ?? data?.error_code ?? undefined;
      console.error("[whatsapp] Twilio notification failed:", response.status, errorCode, data?.message);
      return {
        ok: false,
        errorCode: errorCode ?? undefined,
        error: data?.message || "Twilio rejected the message.",
      };
    }
    return { ok: true, sid: data?.sid, status: data?.status };
  } catch (error) {
    console.error("[whatsapp] Twilio notification error:", error);
    return { ok: false, error: "Unable to contact Twilio. Please try again." };
  }
}

/** Notifies the trainer that a new consultation has been booked. */
export async function sendTwilioWhatsAppBooking(
  to: string,
  booking: BookingWhatsAppPayload,
): Promise<WhatsAppSendResult> {
  return sendTwilioTemplate(
    to,
    process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim(),
    trainerTemplateVariables(booking),
  );
}

/** Confirms the booking to the client who made it. */
export async function sendTwilioWhatsAppCustomer(
  to: string,
  booking: BookingWhatsAppPayload,
): Promise<WhatsAppSendResult> {
  return sendTwilioTemplate(
    to,
    process.env.TWILIO_WHATSAPP_CUSTOMER_CONTENT_SID?.trim(),
    customerTemplateVariables(booking),
  );
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

/**
 * Which Twilio variables are present — the first thing to check when nothing
 * sends. Booleans only: a token must never reach a page.
 *
 * The two Content SIDs are separate because they fail separately: without the
 * trainer one no alert goes out, without the customer one the booker hears
 * nothing, and each is approved by Meta on its own schedule.
 */
export function twilioDiagnostics(): {
  accountSidSet: boolean;
  authTokenSet: boolean;
  fromSet: boolean;
  trainerTemplateSet: boolean;
  customerTemplateSet: boolean;
  ready: boolean;
} {
  const accountSidSet = Boolean(process.env.TWILIO_ACCOUNT_SID?.trim());
  const authTokenSet = Boolean(process.env.TWILIO_AUTH_TOKEN?.trim());
  const fromSet = Boolean(process.env.TWILIO_WHATSAPP_FROM?.trim());
  const trainerTemplateSet = Boolean(process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim());
  const customerTemplateSet = Boolean(process.env.TWILIO_WHATSAPP_CUSTOMER_CONTENT_SID?.trim());
  return {
    accountSidSet,
    authTokenSet,
    fromSet,
    trainerTemplateSet,
    customerTemplateSet,
    // The account trio is what makes a send possible at all; a missing template
    // only takes out the one message that uses it.
    ready: accountSidSet && authTokenSet && fromSet,
  };
}
