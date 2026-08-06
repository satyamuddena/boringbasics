import assert from "node:assert/strict";
import test from "node:test";
import {
  DISPLAY_TIME_ZONE,
  formatDate,
  formatDateTime,
  formatDateTimeLong,
} from "../src/lib/datetime";

/**
 * These run with the machine's own TZ, which is the point: the output must not
 * depend on it. An unpinned formatter renders UTC on the production server and
 * IST on a developer's laptop — that mismatch is what these lock down.
 */

// 08:30 UTC is 14:00 IST the same day.
const UTC_MORNING = "2026-08-06T08:30:00.000000Z";
// 20:00 UTC is 01:30 IST the *next* day — catches a date that slips.
const UTC_LATE = "2026-08-06T20:00:00.000Z";

test("the display zone is pinned, not inherited from the server", () => {
  assert.equal(DISPLAY_TIME_ZONE, "Asia/Kolkata");
});

// ICU glues date and time with "," or "at" depending on version, so assert the
// parts that carry meaning rather than the separator.
const hasParts = (actual: string, parts: string[]) =>
  parts.every((p) => actual.toLowerCase().includes(p.toLowerCase()));

test("a UTC instant renders as the IST wall clock", () => {
  assert.ok(hasParts(formatDateTime(UTC_MORNING), ["6 Aug", "2:00 pm"]), formatDateTime(UTC_MORNING));
  const long = formatDateTimeLong(UTC_MORNING);
  assert.ok(hasParts(long, ["6 August 2026", "2:00 pm", "IST"]), long);
});

test("a late-evening UTC instant rolls into the next IST day", () => {
  assert.ok(hasParts(formatDateTime(UTC_LATE), ["7 Aug", "1:30 am"]), formatDateTime(UTC_LATE));
  assert.equal(formatDate(UTC_LATE), "7 August 2026");
});

test("date-only formatting is zone-pinned too, so it cannot slip a day", () => {
  assert.equal(formatDate("2026-08-06T19:00:00.000Z", "short"), "7 Aug 2026");
  assert.equal(formatDate("2026-08-06T18:00:00.000Z", "short"), "6 Aug 2026");
});

test("empty values degrade quietly instead of printing Invalid Date", () => {
  assert.equal(formatDateTime(null), "");
  assert.equal(formatDate(undefined), "");
  assert.equal(formatDateTimeLong(null), "—");
  assert.equal(formatDateTimeLong(null, "Not booked"), "Not booked");
});
