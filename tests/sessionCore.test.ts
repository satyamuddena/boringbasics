import assert from "node:assert/strict";
import test from "node:test";
import {
  ABSOLUTE_TTL_MS,
  IDLE_TTL_MS,
  REFRESH_AFTER_MS,
  sessionVerdict,
  slidSession,
  type SessionTimes,
} from "../src/lib/sessionCore";

const NOW = new Date("2026-08-06T12:00:00+05:30").getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (n: number) => iso(NOW - n * 24 * 60 * 60 * 1000);

/** A healthy session: logged in a week ago, used a minute ago. */
function session(over: Partial<SessionTimes> = {}): SessionTimes {
  return {
    createdAt: daysAgo(7),
    expiresAt: iso(NOW + IDLE_TTL_MS),
    lastUsedAt: iso(NOW - 60_000),
    ...over,
  };
}

test("a session used a minute ago is valid and not worth a write", () => {
  assert.equal(sessionVerdict(session(), NOW), "valid");
});

test("a session past its idle window is expired", () => {
  assert.equal(sessionVerdict(session({ expiresAt: daysAgo(1) }), NOW), "expired");
});

test("the idle window slides: a session used an hour ago earns a refresh", () => {
  const times = session({ lastUsedAt: iso(NOW - REFRESH_AFTER_MS - 1) });
  assert.equal(sessionVerdict(times, NOW), "refresh");
});

test("rapid successive requests do not each earn a write", () => {
  const times = session({ lastUsedAt: iso(NOW - 1000) });
  assert.equal(sessionVerdict(times, NOW), "valid");
});

test("the absolute cap expires an actively used session", () => {
  // Used seconds ago and nowhere near its idle expiry, but logged in long ago:
  // this is the lost-phone case, so activity must not keep it alive.
  const times = session({
    createdAt: iso(NOW - ABSOLUTE_TTL_MS - 1),
    expiresAt: iso(NOW + IDLE_TTL_MS),
    lastUsedAt: iso(NOW - 1000),
  });
  assert.equal(sessionVerdict(times, NOW), "expired");
});

test("a session just inside the absolute cap survives", () => {
  const times = session({ createdAt: iso(NOW - ABSOLUTE_TTL_MS + 60_000) });
  assert.equal(sessionVerdict(times, NOW), "valid");
});

test("sessions predating the sliding window are migrated on next use", () => {
  // Pre-0019 rows have no lastUsedAt. Null must read as "long ago" so the row
  // gets stamped, not as "just now" which would freeze it until it expired.
  assert.equal(sessionVerdict(session({ lastUsedAt: null }), NOW), "refresh");
});

test("unparseable timestamps fail closed", () => {
  assert.equal(sessionVerdict(session({ expiresAt: "not a date" }), NOW), "expired");
  assert.equal(sessionVerdict(session({ createdAt: "not a date" }), NOW), "expired");
});

test("expiry is exclusive at the boundary", () => {
  assert.equal(sessionVerdict(session({ expiresAt: iso(NOW) }), NOW), "expired");
});

test("a slide pushes expiry a full idle window out", () => {
  const slid = slidSession(NOW);
  assert.equal(slid.lastUsedAt, iso(NOW));
  assert.equal(slid.expiresAt, iso(NOW + IDLE_TTL_MS));
  // And the result is a session that reads as valid.
  assert.equal(sessionVerdict({ createdAt: daysAgo(7), ...slid }, NOW), "valid");
});

test("sliding cannot outrun the absolute cap", () => {
  const slid = slidSession(NOW);
  const verdict = sessionVerdict({ createdAt: iso(NOW - ABSOLUTE_TTL_MS - 1), ...slid }, NOW);
  assert.equal(verdict, "expired");
});
