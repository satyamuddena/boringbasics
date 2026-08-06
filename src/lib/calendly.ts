import "server-only";

interface CalendlyEventResponse {
  resource?: {
    uri?: string;
    start_time?: string;
    /** Calendly sets this to "canceled" when the invitee cancels. */
    status?: string;
  };
}

/** What Calendly last told us. "unverified" means we could not ask. */
export type CalendlySlotStatus = "active" | "canceled" | "unverified";

export interface CalendlyEvent {
  /** Whether the URI is a genuine scheduled event we're willing to trust. */
  ok: boolean;
  /** ISO 8601 start of the booked slot. Absent when verification is skipped. */
  startTime?: string;
  /**
   * Slot state. "unverified" is deliberately distinct from "active" — it means
   * the booking was accepted without a Calendly read, so the admin can see that
   * the time on screen is unconfirmed rather than trusting a blank field.
   */
  status: CalendlySlotStatus;
}

export function calendlyEventUriLooksValid(uri: string | null): boolean {
  if (!uri) return false;
  try {
    const u = new URL(uri);
    return u.protocol === "https:" && u.hostname === "api.calendly.com" && u.pathname.startsWith("/scheduled_events/");
  } catch {
    return false;
  }
}

/**
 * Server-side verification for a Calendly scheduled-event URI, which also
 * returns the slot's start time — the only trustworthy source for *when* the
 * consultation actually is (the app's own timestamps record when the booking
 * was made, not when the call happens).
 *
 * Safe to call repeatedly: this is also the re-sync path, because Calendly
 * never tells us about a cancellation or a reschedule on its own.
 *
 * Without CALENDLY_ACCESS_TOKEN, or when the API is unreachable, the event is
 * accepted as "unverified" rather than rejected — a token outage must not strand
 * a paying customer who has genuinely picked a slot. The URI shape is still
 * checked, so this only ever accepts a well-formed api.calendly.com event.
 */
export async function verifyCalendlyEvent(uri: string | null): Promise<CalendlyEvent> {
  if (!calendlyEventUriLooksValid(uri)) return { ok: false, status: "unverified" };

  const token = process.env.CALENDLY_ACCESS_TOKEN?.trim();
  if (!token || !uri) {
    console.warn("[calendly] CALENDLY_ACCESS_TOKEN is not set — slot times cannot be read.");
    return { ok: true, status: "unverified" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(uri, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    // A 404 means the event genuinely is not ours; anything else is our problem,
    // not the customer's, so it degrades to unverified instead of rejecting.
    if (res.status === 404) return { ok: false, status: "unverified" };
    if (!res.ok) {
      console.error(`[calendly] event read failed with HTTP ${res.status}`);
      return { ok: true, status: "unverified" };
    }
    const data = (await res.json()) as CalendlyEventResponse;
    if (data.resource?.uri !== uri) return { ok: false, status: "unverified" };
    return {
      ok: true,
      startTime: data.resource?.start_time,
      status: data.resource?.status === "canceled" ? "canceled" : "active",
    };
  } catch (err) {
    console.error("[calendly] event verification failed:", err);
    return { ok: true, status: "unverified" };
  }
}
