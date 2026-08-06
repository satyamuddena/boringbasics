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
  21211: "the phone number looks wrong",
  21610: "they have blocked or unsubscribed",
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
