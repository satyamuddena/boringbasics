/**
 * The pure half of the Calendly re-sync: deciding *whether* a booking is worth
 * re-reading. Kept free of `server-only` so it is testable and can be shared;
 * the fetching and writing live in calendlySync.ts.
 */

/** Re-check an active booking at most this often. */
export const RECHECK_AFTER_MS = 15 * 60 * 1000;

/** Don't let one admin page load fan out into dozens of Calendly requests. */
export const MAX_PER_PASS = 10;

export interface SyncableLead {
  id: number;
  stage: string;
  calendlyEventUri: string | null;
  scheduledAt: string | null;
  calendlyStatus: string | null;
  calendlyCheckedAt: string | null;
}

/**
 * True when our copy of the slot is missing or old enough to be worth a read.
 * Terminates: once a row has a time and a status it is only re-read on the
 * throttle, so a healthy row costs nothing.
 */
export function needsCalendlySync(lead: SyncableLead, now = Date.now()): boolean {
  if (lead.stage !== "booked" || !lead.calendlyEventUri) return false;
  // Never successfully read, or read without getting anything back.
  if (!lead.scheduledAt || !lead.calendlyStatus || lead.calendlyStatus === "unverified") return true;
  // A cancelled slot stays cancelled — nothing more to learn.
  if (lead.calendlyStatus === "canceled") return false;
  const checked = lead.calendlyCheckedAt ? new Date(lead.calendlyCheckedAt).getTime() : 0;
  return now - checked >= RECHECK_AFTER_MS;
}
