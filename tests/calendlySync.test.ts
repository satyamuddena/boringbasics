import assert from "node:assert/strict";
import test from "node:test";
import { needsCalendlySync, type SyncableLead } from "../src/lib/calendlySyncCore";

const NOW = new Date("2026-08-06T12:00:00+05:30").getTime();
const minutesAgo = (n: number) => new Date(NOW - n * 60_000).toISOString();

function lead(over: Partial<SyncableLead> = {}): SyncableLead {
  return {
    id: 1,
    stage: "booked",
    calendlyEventUri: "https://api.calendly.com/scheduled_events/abc",
    scheduledAt: "2026-08-10T08:30:00Z",
    calendlyStatus: "active",
    calendlyCheckedAt: minutesAgo(1),
    ...over,
  };
}

test("a freshly checked active booking is left alone", () => {
  assert.equal(needsCalendlySync(lead(), NOW), false);
});

test("a booking with no slot time is always re-read", () => {
  assert.equal(needsCalendlySync(lead({ scheduledAt: null }), NOW), true);
});

test("rows written before the sync existed are re-read", () => {
  assert.equal(
    needsCalendlySync(lead({ calendlyStatus: null, calendlyCheckedAt: null }), NOW),
    true,
  );
});

test("an unverified booking is retried", () => {
  assert.equal(needsCalendlySync(lead({ calendlyStatus: "unverified" }), NOW), true);
});

test("an active booking is re-checked once it goes stale", () => {
  assert.equal(needsCalendlySync(lead({ calendlyCheckedAt: minutesAgo(14) }), NOW), false);
  assert.equal(needsCalendlySync(lead({ calendlyCheckedAt: minutesAgo(16) }), NOW), true);
});

test("a cancelled booking is never re-read — it cannot change back", () => {
  assert.equal(
    needsCalendlySync(lead({ calendlyStatus: "canceled", calendlyCheckedAt: minutesAgo(600) }), NOW),
    false,
  );
});

test("leads that never reached Calendly are skipped", () => {
  assert.equal(needsCalendlySync(lead({ stage: "paid", calendlyEventUri: null }), NOW), false);
  assert.equal(needsCalendlySync(lead({ stage: "details", calendlyEventUri: null }), NOW), false);
  assert.equal(needsCalendlySync(lead({ calendlyEventUri: null }), NOW), false);
});
