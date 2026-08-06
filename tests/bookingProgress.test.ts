import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingProgress,
  inBookingTab,
  type BookingLike,
  type BookingTabKey,
} from "../src/lib/bookingProgress";

const NOW = new Date("2026-08-06T12:00:00+05:30").getTime();
const minutesAgo = (n: number) => new Date(NOW - n * 60_000).toISOString();

function lead(over: Partial<BookingLike> = {}): BookingLike {
  return {
    stage: "details",
    status: "new",
    createdAt: minutesAgo(5),
    paidAt: null,
    bookedAt: null,
    scheduledAt: null,
    amountPaise: null,
    currency: null,
    ...over,
  };
}

const stateOf = (l: BookingLike, key: string) =>
  bookingProgress(l, NOW).steps.find((s) => s.key === key)!.state;

test("a fresh lead is left alone until the 30 minute mark", () => {
  const fresh = bookingProgress(lead({ createdAt: minutesAgo(5) }), NOW);
  assert.equal(fresh.needsFollowup, false);
  assert.equal(fresh.tone, "info");

  const stale = bookingProgress(lead({ createdAt: minutesAgo(31) }), NOW);
  assert.equal(stale.needsFollowup, true);
  assert.equal(stale.tone, "warn");
  assert.equal(stale.headline, "They filled the form but never paid");
});

test("paid with no slot is the case a trainer must chase", () => {
  const p = bookingProgress(
    lead({ stage: "paid", paidAt: minutesAgo(60), amountPaise: 99900, currency: "INR" }),
    NOW,
  );
  assert.equal(p.needsFollowup, true);
  assert.equal(p.headline, "They paid but have not picked a time");
  assert.equal(p.steps.find((s) => s.key === "paid")!.state, "done");
  assert.equal(p.steps.find((s) => s.key === "paid")!.label, "Paid ₹999");
  assert.equal(p.steps.find((s) => s.key === "booked")!.state, "now");
});

test("a booked future call needs nothing", () => {
  const l = lead({
    stage: "booked",
    paidAt: minutesAgo(120),
    bookedAt: minutesAgo(119),
    scheduledAt: new Date(NOW + 3 * 86_400_000).toISOString(),
  });
  const p = bookingProgress(l, NOW);
  assert.equal(p.needsFollowup, false);
  assert.equal(p.tone, "ok");
  assert.equal(stateOf(l, "booked"), "done");
  assert.equal(stateOf(l, "done"), "todo");
});

test("a passed slot time alone never claims the call happened", () => {
  const l = lead({
    stage: "booked",
    paidAt: minutesAgo(5000),
    scheduledAt: new Date(NOW - 86_400_000).toISOString(),
  });
  const p = bookingProgress(l, NOW);
  // The clock cannot know whether anyone turned up, so the step asks instead
  // of asserting — a no-show must not read as a completed consultation.
  assert.equal(stateOf(l, "done"), "now");
  assert.equal(p.steps.find((s) => s.key === "done")!.label, "Call time passed");
  assert.match(p.headline, /^The call time passed on /);
  assert.equal(p.needsFollowup, true);
});

test("closing a booking after the slot is what marks the call done", () => {
  const l = lead({
    stage: "booked",
    status: "closed",
    paidAt: minutesAgo(5000),
    scheduledAt: new Date(NOW - 86_400_000).toISOString(),
  });
  const p = bookingProgress(l, NOW);
  assert.equal(stateOf(l, "done"), "done");
  assert.equal(p.steps.find((s) => s.key === "done")!.label, "Call done");
  assert.equal(p.headline, "Call done");
  assert.equal(p.tone, "ok");
  assert.equal(p.needsFollowup, false);
});

test("closing before the slot does not backdate a call that never happened", () => {
  const l = lead({
    stage: "booked",
    status: "closed",
    paidAt: minutesAgo(5000),
    scheduledAt: new Date(NOW + 86_400_000).toISOString(),
  });
  assert.equal(stateOf(l, "done"), "todo");
  assert.equal(bookingProgress(l, NOW).headline, "This booking is closed");
});

test("booked without a readable slot points at the Calendly token", () => {
  const p = bookingProgress(lead({ stage: "booked", paidAt: minutesAgo(60) }), NOW);
  assert.equal(p.tone, "warn");
  assert.match(p.hint, /CALENDLY_ACCESS_TOKEN/);
});

test("a slot cancelled in Calendly stops reading as booked", () => {
  const l = lead({
    stage: "booked",
    paidAt: minutesAgo(5000),
    scheduledAt: new Date(NOW + 2 * 86_400_000).toISOString(),
    calendlyStatus: "canceled",
  });
  const p = bookingProgress(l, NOW);
  assert.equal(p.headline, "They cancelled the call");
  assert.equal(p.needsFollowup, true);
  assert.equal(stateOf(l, "booked"), "now");
  assert.equal(p.steps.find((s) => s.key === "booked")!.label, "Cancelled");
  // A cancelled future call must never count as a completed consultation.
  assert.equal(stateOf(l, "done"), "todo");
});

test("a slot we could not confirm is shown but not trusted", () => {
  const p = bookingProgress(
    lead({
      stage: "booked",
      paidAt: minutesAgo(5000),
      scheduledAt: new Date(NOW + 86_400_000).toISOString(),
      calendlyStatus: "unverified",
    }),
    NOW,
  );
  assert.equal(p.tone, "info");
  assert.match(p.hint, /could not reach Calendly/);
  assert.equal(p.needsFollowup, false);
});

test("a lead messaged recently drops out of the waiting-on-me list", () => {
  const p = bookingProgress(
    lead({ stage: "paid", paidAt: minutesAgo(300), contactedAt: minutesAgo(120), status: "contacted" }),
    NOW,
  );
  // Still not booked, but the ball is in their court — nagging the trainer
  // again two hours after they messaged is just noise.
  assert.equal(p.needsFollowup, false);
  assert.equal(p.tone, "info");
  assert.match(p.hint, /You messaged them 2h ago/);
});

test("a lead messaged over a day ago comes back for another nudge", () => {
  const p = bookingProgress(
    lead({
      stage: "paid",
      paidAt: minutesAgo(5000),
      contactedAt: minutesAgo(25 * 60),
      status: "contacted",
    }),
    NOW,
  );
  assert.equal(p.needsFollowup, true);
  assert.equal(p.tone, "warn");
  assert.match(p.hint, /still have not picked a time/);
});

test("the same rule applies to a lead that never paid", () => {
  const fresh = bookingProgress(
    lead({ createdAt: minutesAgo(200), contactedAt: minutesAgo(30), status: "contacted" }),
    NOW,
  );
  assert.equal(fresh.needsFollowup, false);

  const stale = bookingProgress(
    lead({ createdAt: minutesAgo(5000), contactedAt: minutesAgo(48 * 60), status: "contacted" }),
    NOW,
  );
  assert.equal(stale.needsFollowup, true);
  assert.match(stale.hint, /2d ago and they still have not paid/);
});

test("never-contacted leads keep the original wording", () => {
  const p = bookingProgress(lead({ stage: "paid", paidAt: minutesAgo(60) }), NOW);
  assert.equal(p.hint, "Message them and help them pick a time.");
  assert.equal(p.needsFollowup, true);
});

test("closing a lead silences the follow-up, whatever the stage", () => {
  const p = bookingProgress(lead({ stage: "paid", status: "closed", paidAt: minutesAgo(60) }), NOW);
  assert.equal(p.needsFollowup, false);
  assert.equal(p.headline, "This booking is closed");
});

/* ---------------- tabs ---------------- */

const tabsFor = (l: BookingLike): BookingTabKey[] =>
  (["upcoming", "needs", "unpaid", "notime", "closed", "all"] as const).filter((t) =>
    inBookingTab(t, l, bookingProgress(l, NOW), NOW),
  );

test("a future call sits under Upcoming and nowhere that demands work", () => {
  const l = lead({
    stage: "booked",
    paidAt: minutesAgo(5000),
    scheduledAt: new Date(NOW + 2 * 86_400_000).toISOString(),
    calendlyStatus: "active",
  });
  assert.deepEqual(tabsFor(l), ["upcoming", "all"]);
});

test("a cancelled booking leaves Upcoming and lands in Needs you", () => {
  const l = lead({
    stage: "booked",
    paidAt: minutesAgo(5000),
    scheduledAt: new Date(NOW + 2 * 86_400_000).toISOString(),
    calendlyStatus: "canceled",
  });
  assert.deepEqual(tabsFor(l), ["needs", "all"]);
});

test("a call whose time has passed is no longer Upcoming", () => {
  const l = lead({
    stage: "booked",
    paidAt: minutesAgo(5000),
    scheduledAt: new Date(NOW - 86_400_000).toISOString(),
    calendlyStatus: "active",
  });
  assert.equal(inBookingTab("upcoming", l, bookingProgress(l, NOW), NOW), false);
  assert.equal(inBookingTab("needs", l, bookingProgress(l, NOW), NOW), true);
});

test("paid-but-no-time appears under both its stage tab and Needs you", () => {
  const l = lead({ stage: "paid", paidAt: minutesAgo(60) });
  assert.deepEqual(tabsFor(l), ["needs", "notime", "all"]);
});

test("an abandoned form shows under Never paid, a fresh one does not nag", () => {
  const stale = lead({ createdAt: minutesAgo(120) });
  assert.deepEqual(tabsFor(stale), ["needs", "unpaid", "all"]);

  const fresh = lead({ createdAt: minutesAgo(5) });
  assert.deepEqual(tabsFor(fresh), ["unpaid", "all"]);
});

test("closing a booking moves it to Closed and out of Needs you", () => {
  const l = lead({ stage: "paid", status: "closed", paidAt: minutesAgo(60) });
  assert.deepEqual(tabsFor(l), ["notime", "closed", "all"]);
});

test("every booking is in All, whatever its state", () => {
  for (const l of [
    lead(),
    lead({ stage: "paid", paidAt: minutesAgo(60) }),
    lead({ stage: "booked", scheduledAt: null, calendlyStatus: "unverified" }),
    lead({ status: "closed" }),
  ]) {
    assert.ok(tabsFor(l).includes("all"));
  }
});
