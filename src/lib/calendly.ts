import "server-only";

interface CalendlyEventResponse {
  resource?: {
    uri?: string;
  };
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
 * Optional server-side verification for a Calendly scheduled-event URI.
 * Configure CALENDLY_ACCESS_TOKEN to enforce API validation.
 */
export async function verifyCalendlyEventUri(uri: string | null): Promise<boolean> {
  if (!calendlyEventUriLooksValid(uri)) return false;

  const token = process.env.CALENDLY_ACCESS_TOKEN?.trim();
  if (!token || !uri) {
    return process.env.NODE_ENV !== "production";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(uri, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = (await res.json()) as CalendlyEventResponse;
    return data.resource?.uri === uri;
  } catch (err) {
    console.error("[calendly] event verification failed:", err);
    return false;
  }
}
