import "server-only";

import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { verifyCalendlyEvent, type CalendlySlotStatus } from "@/lib/calendly";
import { MAX_PER_PASS, needsCalendlySync, type SyncableLead } from "@/lib/calendlySyncCore";

/**
 * Calendly is the source of truth for a slot, and it never calls us back. A
 * booking written once at scheduling time goes stale the moment the customer
 * reschedules or cancels, so anything that displays a slot re-reads it here.
 */

/** Read one booking back from Calendly and store what it says. */
export async function syncCalendlyEvent(leadId: number): Promise<CalendlySlotStatus | null> {
  const db = getDb();
  const lead = db.select().from(t.leads).where(eq(t.leads.id, leadId)).get();
  if (!lead?.calendlyEventUri) return null;

  const event = await verifyCalendlyEvent(lead.calendlyEventUri);
  const checkedAt = new Date().toISOString();
  db.update(t.leads)
    .set({
      // Keep the time we already had if this read could not produce one —
      // an outage must not wipe a known-good slot.
      scheduledAt: event.startTime ?? lead.scheduledAt,
      calendlyStatus: event.status,
      calendlyCheckedAt: checkedAt,
    })
    .where(eq(t.leads.id, leadId))
    .run();
  return event.status;
}

/**
 * Heal every stale booking in a list, bounded so a big admin page can't turn
 * into a burst of API calls. Failures are swallowed — a Calendly outage must
 * never stop the bookings page from rendering.
 */
export async function syncStaleCalendlyEvents(leads: SyncableLead[], now = Date.now()): Promise<number> {
  const stale = leads.filter((l) => needsCalendlySync(l, now)).slice(0, MAX_PER_PASS);
  if (!stale.length) return 0;
  const results = await Promise.allSettled(stale.map((l) => syncCalendlyEvent(l.id)));
  return results.filter((r) => r.status === "fulfilled" && r.value !== null).length;
}
