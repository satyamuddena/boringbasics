/**
 * Every date shown anywhere in the app goes through here.
 *
 * Timestamps are stored as UTC ISO strings and Calendly hands back UTC too, so
 * an unpinned `toLocaleString()` renders in whatever zone the *server* happens
 * to run in — UTC in production. Pinning the zone here means the admin and the
 * customer always read the same wall-clock time, and a server render matches a
 * client render exactly (no hydration drift).
 */

/** The clock everyone in this business works to. Change in one place. */
export const DISPLAY_TIME_ZONE = "Asia/Kolkata";

/** Short label appended when the zone itself matters (call times, receipts). */
export const DISPLAY_TIME_ZONE_LABEL = "IST";

const LOCALE = "en-IN";

/** "6 Aug, 2:00 pm" — compact, for tables. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

/** "6 August 2026, 2:00 pm IST" — unambiguous, for detail views. */
export function formatDateTimeLong(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  return `${new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value))} ${DISPLAY_TIME_ZONE_LABEL}`;
}

/** "6 August 2026" — date only, still zone-pinned so it can't slip a day. */
export function formatDate(value: string | null | undefined, month: "short" | "long" = "long") {
  if (!value) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month,
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}
