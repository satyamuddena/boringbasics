import assert from "node:assert/strict";
import test from "node:test";
import { dueReminders } from "../src/lib/reminderCore";
import { callReminderNotification } from "../src/lib/pushTemplate";

const NOW = Date.parse("2026-08-07T10:00:00.000Z");
const at = (minutesFromNow: number) => new Date(NOW + minutesFromNow * 60_000).toISOString();

const booking = (over: Partial<Parameters<typeof dueReminders>[0][number]> = {}) => ({
  id: 1,
  stage: "booked",
  scheduledAt: at(8),
  reminderSentAt: null,
  ...over,
});

test("a call inside the lead window is due", () => {
  const due = dueReminders([booking({ scheduledAt: at(8) })], NOW, 10);
  assert.equal(due.length, 1);
});

test("a call beyond the window is not due yet", () => {
  assert.equal(dueReminders([booking({ scheduledAt: at(25) })], NOW, 10).length, 0);
});

test("a call that has already started is never reminded", () => {
  // The important one: a server asleep for an hour must not wake up and buzz
  // about calls that are already over.
  assert.equal(dueReminders([booking({ scheduledAt: at(-1) })], NOW, 10).length, 0);
  assert.equal(dueReminders([booking({ scheduledAt: at(-90) })], NOW, 10).length, 0);
});

test("a late tick still sends, because a late reminder beats none", () => {
  // Runner intended to fire at 10 minutes out but only got here at 3.
  assert.equal(dueReminders([booking({ scheduledAt: at(3) })], NOW, 10).length, 1);
});

test("a booking already reminded is never reminded twice", () => {
  const already = booking({ scheduledAt: at(8), reminderSentAt: at(-2) });
  assert.equal(dueReminders([already], NOW, 10).length, 0);
});

test("only confirmed bookings qualify", () => {
  for (const stage of ["paid", "details", "created", "cancelled"]) {
    assert.equal(dueReminders([booking({ stage, scheduledAt: at(5) })], NOW, 10).length, 0, stage);
  }
  assert.equal(dueReminders([booking({ stage: "booked", scheduledAt: at(5) })], NOW, 10).length, 1);
});

test("missing or unparseable times are ignored rather than throwing", () => {
  assert.equal(dueReminders([booking({ scheduledAt: null })], NOW, 10).length, 0);
  assert.equal(dueReminders([booking({ scheduledAt: "not a date" })], NOW, 10).length, 0);
});

test("the lead time is honoured, not hard-coded", () => {
  const b = [booking({ scheduledAt: at(12) })];
  assert.equal(dueReminders(b, NOW, 10).length, 0, "12 min away, 10 min lead");
  assert.equal(dueReminders(b, NOW, 15).length, 1, "12 min away, 15 min lead");
});

test("several due calls come back soonest first", () => {
  const due = dueReminders(
    [
      { id: 1, stage: "booked", scheduledAt: at(9), reminderSentAt: null },
      { id: 2, stage: "booked", scheduledAt: at(2), reminderSentAt: null },
      { id: 3, stage: "booked", scheduledAt: at(6), reminderSentAt: null },
    ],
    NOW,
    10,
  );
  assert.deepEqual(
    due.map((d) => d.id),
    [2, 3, 1],
  );
});

test("the reminder says how long is left and leaks nothing else", () => {
  const n = callReminderNotification(
    {
      id: 77,
      name: "Priya Nair",
      scheduledAt: "2026-08-07T12:30:00+05:30",
      whatsapp: "+919876543210",
      email: "priya@example.com",
      amount: 149900,
    },
    15,
  );
  assert.match(n.title, /15 minutes/);
  assert.match(n.body, /Priya/);
  const text = `${n.title} ${n.body}`;
  for (const secret of ["Nair", "9876543210", "priya@example.com", "1499", "149900"]) {
    assert.ok(!text.includes(secret), `leaked ${secret}`);
  }
});

test("the reminder does not collapse into the booking notification", () => {
  // Same tag would replace the days-old booking alert and could swallow the
  // reminder at the moment it matters.
  const r = callReminderNotification({ id: 77, name: "Priya" }, 10);
  assert.equal(r.tag, "reminder-77");
  assert.ok(r.icon.includes("reminder"));
  assert.ok(r.badge.includes("reminder"));
});
