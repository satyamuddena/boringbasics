import assert from "node:assert/strict";
import test from "node:test";
import { byCallTime } from "../src/lib/bookingProgress";
import { vapidSubject } from "../src/lib/pushTemplate";

const at = (id: number, scheduledAt: string | null) => ({ id, scheduledAt });

test("the soonest call comes first, even when booked later", () => {
  // The reported bug: booking #7 at 2:00 pm sat above #6 at 1:30 pm because the
  // list was ordered by booking id descending.
  const rows = [
    at(7, "2026-08-07T14:00:00.000Z"),
    at(6, "2026-08-07T13:30:00.000Z"),
  ].sort(byCallTime);
  assert.deepEqual(
    rows.map((r) => r.id),
    [6, 7],
  );
});

test("a full day sorts ascending regardless of booking order", () => {
  const rows = [
    at(1, "2026-08-07T17:00:00.000Z"),
    at(9, "2026-08-07T09:00:00.000Z"),
    at(4, "2026-08-07T12:00:00.000Z"),
  ].sort(byCallTime);
  assert.deepEqual(
    rows.map((r) => r.id),
    [9, 4, 1],
  );
});

test("bookings with no time sink below scheduled ones", () => {
  const rows = [at(3, null), at(5, "2026-08-07T10:00:00.000Z")].sort(byCallTime);
  assert.deepEqual(
    rows.map((r) => r.id),
    [5, 3],
  );
});

test("an unparseable time is treated as missing, not as time zero", () => {
  // Left to NaN this would compare false both ways and could land anywhere.
  const rows = [at(3, "not a date"), at(5, "2026-08-07T10:00:00.000Z")].sort(byCallTime);
  assert.deepEqual(
    rows.map((r) => r.id),
    [5, 3],
  );
});

test("identical times stay in a stable, newest-first order", () => {
  const same = "2026-08-07T10:00:00.000Z";
  const rows = [at(2, same), at(8, same), at(5, same)].sort(byCallTime);
  assert.deepEqual(
    rows.map((r) => r.id),
    [8, 5, 2],
  );
});

test("VAPID subject: a configured URI is used as-is", () => {
  assert.equal(vapidSubject("mailto:hello@example.com", "admin@x.com"), "mailto:hello@example.com");
  assert.equal(vapidSubject("https://example.com", "admin@x.com"), "https://example.com");
});

test("VAPID subject: a bare address is promoted rather than rejected", () => {
  // web-push throws on a missing scheme, and this is the likeliest way to fill
  // the variable in by hand.
  assert.equal(vapidSubject("hello@example.com", undefined), "mailto:hello@example.com");
});

test("VAPID subject: falls back to the admin login when unset", () => {
  assert.equal(vapidSubject(undefined, "admin@fitizens.in"), "mailto:admin@fitizens.in");
  assert.equal(vapidSubject("   ", "admin@fitizens.in"), "mailto:admin@fitizens.in");
});

test("VAPID subject: unusable values fall through to the next candidate", () => {
  assert.equal(vapidSubject("http://insecure.example", "admin@x.com"), "mailto:admin@x.com");
  assert.equal(vapidSubject("nonsense", "admin@x.com"), "mailto:admin@x.com");
  assert.equal(vapidSubject("nonsense", "also nonsense"), "mailto:admin@boringbasics.fit");
});
