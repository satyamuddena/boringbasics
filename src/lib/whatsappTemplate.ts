/**
 * Pure message-shaping for the booking WhatsApp notifications. Kept apart from
 * `whatsapp.ts` (which is server-only and talks to Twilio) so the formatting
 * and validation can be unit tested — same split as newsletter/newsletterTemplate.
 * Dependency-free by design: `libphonenumber-js` cannot be loaded by the tsx
 * test runner, so the strict number check lives in `whatsapp.ts` on top of the
 * structural one here.
 */

export interface BookingWhatsAppPayload {
  name: string;
  whatsapp: string;
  email: string | null;
  /** When the booking was completed. Fallback only — not the appointment. */
  bookedAt: string;
  /** ISO start of the booked slot, from the Calendly API. */
  scheduledAt?: string | null;
  /** Trainer brand, shown as the sign-off in the customer message. */
  brand?: string;
  /** e.g. "45 minutes" — shown to the customer. */
  durationLabel?: string;
}

/** Twilio rejects empty Content variables, so every slot needs a fallback. */
const DASH = "—";

const fill = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DASH;
};

/**
 * Formats an instant as the trainer and client read it — IST, matching the
 * timezone Calendly presents slots in.
 */
export function bookingDateAndTime(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      timeZone: "Asia/Kolkata",
    }).format(date),
    time: new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
      .format(date)
      .replace(/\b(am|pm)\b/i, (match) => match.toUpperCase()),
  };
}

/** The appointment time, falling back to the booking timestamp. */
export function appointmentDateAndTime(booking: BookingWhatsAppPayload) {
  return bookingDateAndTime(booking.scheduledAt || booking.bookedAt);
}

/**
 * Strips a recipient down to E.164 digits, rejecting anything that cannot be a
 * phone number at all. Numbers reach us from three places — the public form,
 * the admin trainer profile, and the admin test page. `whatsapp.ts` applies the
 * stricter country-aware check on top before sending.
 */
export function normaliseWhatsAppDigits(raw: string | null | undefined): string | null {
  const digits = raw?.replace(/\D/g, "") ?? "";
  if (digits.length < 8 || digits.length > 15) return null; // E.164 bounds
  if (digits.startsWith("0")) return null; // country codes never start with 0
  return digits;
}

/** Trainer alert — {{1}} name, {{2}} phone, {{3}} date, {{4}} time, {{5}} email. */
export function trainerTemplateVariables(booking: BookingWhatsAppPayload): Record<string, string> {
  const { date, time } = appointmentDateAndTime(booking);
  return {
    "1": fill(booking.name),
    "2": fill(booking.whatsapp),
    "3": date,
    "4": time,
    "5": fill(booking.email),
  };
}

/** Customer confirmation — {{1}} first name, {{2}} date, {{3}} time, {{4}} duration, {{5}} brand. */
export function customerTemplateVariables(booking: BookingWhatsAppPayload): Record<string, string> {
  const { date, time } = appointmentDateAndTime(booking);
  return {
    "1": fill(booking.name.trim().split(/\s+/)[0]),
    "2": date,
    "3": time,
    "4": fill(booking.durationLabel),
    "5": fill(booking.brand),
  };
}
