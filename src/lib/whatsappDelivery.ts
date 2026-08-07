/**
 * Turning a Twilio message state into something a trainer can trust.
 *
 * The send API returns 2xx with `status: "queued"` as soon as Twilio accepts
 * the request. That is not delivery — a template can still be rejected by
 * WhatsApp seconds later, and the only way to learn that is the delivery
 * receipt. So "we sent it" and "they got it" are different claims and the UI
 * must never collapse them.
 */

export type DeliveryTone = "ok" | "warn" | "bad";

export interface DeliveryLabel {
  text: string;
  tone: DeliveryTone;
  /** True only when WhatsApp confirmed the handset received it. */
  confirmed: boolean;
}

/** The Twilio failures that actually happen, in words a trainer understands. */
export const WHATSAPP_ERROR: Record<number, string> = {
  63003: "that number is not on WhatsApp",
  63015: "the number has not opted in",
  63016: "sent outside the 24-hour window without an approved template",
  63024: "the message template was rejected",
  63051: "the WhatsApp sender is not registered",
  63112: "Meta has disabled or not yet verified the WhatsApp Business Account",
  21211: "the phone number looks wrong",
  21610: "they have blocked or unsubscribed",
};

/**
 * What to actually do about it. Separate from the label above because the label
 * goes in a table cell and this goes under the test result.
 *
 * These are kept per-code on purpose: the diagnostics page used to print the
 * same sandbox advice for every failure, which sent us chasing an opt-in
 * problem when Meta had simply not verified the business.
 */
export const WHATSAPP_FIX: Record<number, string> = {
  63003: "Check the number is on WhatsApp and includes the country code.",
  63015:
    "The sender is the Twilio Sandbox and this recipient has not joined it — they must send “join <your-code>” to the sandbox number, and re-join every 3 days. Customers will never have done this, so a registered sender is required before customer confirmations can work.",
  63016:
    "The last message was over 24 hours ago, so WhatsApp requires an approved Content Template. Check the template is approved in Twilio Console → Content Template Builder.",
  63024: "The Content Template was rejected. Edit and resubmit it for approval.",
  63051:
    "This number is not registered as a WhatsApp sender in Twilio Console → Messaging → Senders.",
  63112:
    "Not a sandbox or template problem: Meta has disabled the WhatsApp Business Account behind this sender, or its business verification is still pending. Finish Meta Business Verification in Meta Business Manager (or appeal the restriction) — no message can leave until Meta re-enables it. If you deleted and re-registered this number, also turn off Two-Factor Authentication for it in WhatsApp Manager.",
  21211: "Twilio rejected the number format. Use full international form, e.g. +919876543210.",
  21610: "This recipient blocked or unsubscribed from your messages.",
};

export interface DeliveryInput {
  ok?: boolean;
  status?: string;
  errorCode?: number;
  error?: string;
}

export function whatsAppDelivery(note: DeliveryInput | undefined): DeliveryLabel {
  if (!note) return { text: "Not sent", tone: "warn", confirmed: false };

  if (note.ok === false) {
    const reason = note.errorCode ? WHATSAPP_ERROR[note.errorCode] : undefined;
    return {
      text: reason ? `Did not send — ${reason}` : "Did not send",
      tone: "bad",
      confirmed: false,
    };
  }

  switch (note.status) {
    case "delivered":
      return { text: "Delivered", tone: "ok", confirmed: true };
    case "read":
      return { text: "Read", tone: "ok", confirmed: true };
    case "failed":
    case "undelivered": {
      const reason = note.errorCode ? WHATSAPP_ERROR[note.errorCode] : undefined;
      return {
        text: reason ? `Never arrived — ${reason}` : "Never arrived",
        tone: "bad",
        confirmed: false,
      };
    }
    default:
      // queued / accepted / sending / sent — Twilio has it, WhatsApp has not
      // confirmed anything. Saying "sent" here is the honest ceiling.
      return { text: "Handed to Twilio, not confirmed", tone: "warn", confirmed: false };
  }
}
