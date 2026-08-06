import "server-only";

interface CalendlyEventResponse {
  resource?: {
    uri?: string;
    start_time?: string;
  };
}

export interface CalendlyEvent {
  /** Whether the URI is a genuine scheduled event we're willing to trust. */
  ok: boolean;
  /** ISO 8601 start of the booked slot. Absent when verification is skipped. */
  startTime?: string;
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
 * Configure CALENDLY_ACCESS_TOKEN to enforce API validation; without it
 * verification is skipped outside production and no start time is available.
 */
export async function verifyCalendlyEvent(uri: string | null): Promise<CalendlyEvent> {
  if (!calendlyEventUriLooksValid(uri)) return { ok: false };

  const token = process.env.CALENDLY_ACCESS_TOKEN?.trim();
  if (!token || !uri) {
    return { ok: process.env.NODE_ENV !== "production" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(uri, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as CalendlyEventResponse;
    if (data.resource?.uri !== uri) return { ok: false };
    return { ok: true, startTime: data.resource?.start_time };
  } catch (err) {
    console.error("[calendly] event verification failed:", err);
    return { ok: false };
  }
}
