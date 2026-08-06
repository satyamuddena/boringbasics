import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingConfirmedNotification,
  firstName,
  paymentReceivedNotification,
  testNotification,
} from "../src/lib/pushTemplate";

/**
 * A full booking, including everything that must NOT reach a lock screen.
 * Passing the whole row is the point: it proves the builders take only what
 * they are allowed to rather than relying on callers to pre-redact.
 */
const BOOKING = {
  id: 42,
  name: "Priya Nair",
  whatsapp: "919876543210",
  email: "priya@example.com",
  amountPaise: 49900,
  currency: "INR",
  razorpayPaymentId: "pay_ABC123",
  razorpayOrderId: "order_XYZ789",
  message: "I have a shoulder injury I would rather not discuss publicly",
  goal: "fat-loss",
  scheduledAt: "2026-08-12T12:30:00Z", // 6:00 PM IST
};

/** Everything private that appears anywhere in the booking above. */
const SECRETS = [
  "Nair",
  "919876543210",
  "9876543210",
  "priya@example.com",
  "49900",
  "499",
  "pay_ABC123",
  "order_XYZ789",
  "shoulder",
];

function assertNoSecrets(text: string) {
  for (const secret of SECRETS) {
    assert.ok(
      !text.toLowerCase().includes(secret.toLowerCase()),
      `notification text leaked ${secret}: ${text}`,
    );
  }
}

test("a confirmed booking shows a first name and the slot time", () => {
  const n = bookingConfirmedNotification(BOOKING);
  assert.equal(n.title, "New booking");
  assert.match(n.body, /^Priya · /);
  assert.match(n.body, /12 August/);
  assert.match(n.body, /6:00 PM/);
});

test("a confirmed booking leaks nothing else onto the lock screen", () => {
  const n = bookingConfirmedNotification(BOOKING);
  assertNoSecrets(`${n.title} ${n.body}`);
});

test("a payment notification leaks nothing, including the amount", () => {
  const n = paymentReceivedNotification(BOOKING);
  assert.equal(n.title, "Payment received");
  assert.equal(n.body, "Priya · no slot picked yet");
  assertNoSecrets(`${n.title} ${n.body}`);
});

test("a booking with no slot yet still says something useful", () => {
  const n = bookingConfirmedNotification({ ...BOOKING, scheduledAt: null });
  assert.equal(n.body, "Priya · time to be confirmed");
});

test("notifications deep-link to the one booking", () => {
  assert.equal(bookingConfirmedNotification(BOOKING).url, "/admin/leads?tab=all&q=42");
  // Unpaid-but-no-slot lands on the tab that actually contains it.
  assert.equal(paymentReceivedNotification(BOOKING).url, "/admin/leads?tab=notime&q=42");
});

test("repeat notifications for one booking collapse instead of stacking", () => {
  assert.equal(bookingConfirmedNotification(BOOKING).tag, "booking-42");
  assert.equal(paymentReceivedNotification(BOOKING).tag, "booking-42");
});

test("first names are extracted, never surnames", () => {
  assert.equal(firstName("Priya Nair"), "Priya");
  assert.equal(firstName("  Ravi   Kumar  Reddy "), "Ravi");
  assert.equal(firstName("Cher"), "Cher");
});

test("a missing or blank name degrades to a stand-in rather than an empty body", () => {
  assert.equal(firstName(""), "Someone");
  assert.equal(firstName("   "), "Someone");
  assert.equal(firstName(null), "Someone");
  assert.equal(firstName(undefined), "Someone");
  assert.equal(bookingConfirmedNotification({ ...BOOKING, name: "" }).body.startsWith("Someone"), true);
});

test("the test notification carries no booking data at all", () => {
  const n = testNotification();
  assert.equal(n.url, "/admin/leads");
  assertNoSecrets(`${n.title} ${n.body}`);
});
