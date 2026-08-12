import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsWindow,
  bookingState,
  buildAnalyticsLifetimeSummary,
  buildAnalyticsOperationsTrend,
  buildAnalyticsReport,
  buildAnalyticsTrendSummary,
  normalizeAnalyticsTrendRange,
  type AnalyticsLead,
} from "../src/lib/analytics";

const now = new Date("2026-08-12T05:00:00.000Z"); // 10:30 am IST

function lead(overrides: Partial<AnalyticsLead> = {}): AnalyticsLead {
  return {
    id: 1,
    name: "Client",
    whatsapp: "+919999999999",
    email: null,
    goal: null,
    status: "new",
    stage: "details",
    amountPaise: null,
    currency: "INR",
    paidAt: null,
    bookedAt: null,
    scheduledAt: null,
    calendlyStatus: null,
    createdAt: "2026-08-03T04:30:00.000Z",
    ...overrides,
  };
}

test("monthly analytics window starts at midnight IST and compares equal elapsed time", () => {
  const window = analyticsWindow("month", now);
  assert.equal(window.start.toISOString(), "2026-07-31T18:30:00.000Z");
  assert.equal(window.end.toISOString(), now.toISOString());
  assert.equal(window.previousStart.toISOString(), "2026-06-30T18:30:00.000Z");
  assert.equal(window.previousEnd.toISOString(), "2026-07-12T05:00:00.000Z");
});

test("an explicitly selected past month covers the complete calendar month", () => {
  const window = analyticsWindow("month", now, "2026-02");
  assert.equal(window.start.toISOString(), "2026-01-31T18:30:00.000Z");
  assert.equal(window.end.toISOString(), "2026-02-28T18:30:00.000Z");
  assert.equal(window.previousStart.toISOString(), "2025-12-31T18:30:00.000Z");
  assert.equal(window.previousEnd.toISOString(), window.start.toISOString());
  assert.equal(window.label, "February 2026");
});

test("an explicitly selected future year shows all twelve months", () => {
  const report = buildAnalyticsReport([], "year", now, "2028");
  assert.equal(report.window.label, "2028");
  assert.equal(report.window.previousLabel, "2027");
  assert.equal(report.buckets.length, 12);
  assert.equal(report.buckets[0]?.label, "Jan 28");
  assert.equal(report.buckets[11]?.label, "Dec 28");
});

test("booking states are exclusive and cover the four operational buckets", () => {
  assert.equal(bookingState(lead(), now), "unpaid");
  assert.equal(bookingState(lead({ stage: "paid", paidAt: "2026-08-04T04:30:00Z" }), now), "notime");
  assert.equal(
    bookingState(
      lead({ stage: "booked", scheduledAt: "2026-08-15T10:30:00Z", calendlyStatus: "active" }),
      now,
    ),
    "upcoming",
  );
  assert.equal(
    bookingState(
      lead({ stage: "booked", scheduledAt: "2026-08-10T10:30:00Z", calendlyStatus: "active" }),
      now,
    ),
    "closed",
  );
});

test("report calculates INR revenue, funnel, states, and latest payments", () => {
  const leads = [
    lead({ id: 1 }),
    lead({
      id: 2,
      stage: "paid",
      amountPaise: 399900,
      paidAt: "2026-08-05T04:30:00Z",
    }),
    lead({
      id: 3,
      stage: "booked",
      amountPaise: 499900,
      paidAt: "2026-08-06T04:30:00Z",
      scheduledAt: "2026-08-15T10:30:00Z",
      calendlyStatus: "active",
    }),
    lead({
      id: 4,
      stage: "booked",
      status: "closed",
      amountPaise: 399900,
      paidAt: "2026-08-07T04:30:00Z",
      scheduledAt: "2026-08-10T10:30:00Z",
      calendlyStatus: "active",
    }),
    lead({
      id: 5,
      stage: "paid",
      amountPaise: 2500,
      currency: "USD",
      paidAt: "2026-08-08T04:30:00Z",
    }),
  ];

  const report = buildAnalyticsReport(leads, "month", now);
  assert.equal(report.revenuePaise, 1_299_700);
  assert.equal(report.payments, 3);
  assert.deepEqual(report.funnel, { formFilled: 5, paid: 3, timePicked: 2, callDone: 1 });
  assert.deepEqual(report.states, { upcoming: 1, unpaid: 1, notime: 2, closed: 1 });
  assert.equal(report.scheduledRevenuePaise, 899_800);
  assert.equal(report.awaitingTimeRevenuePaise, 399_900);
  assert.deepEqual(report.latestPayments.map((item) => item.id), [4, 3, 2]);
});

test("lifetime cards distinguish confirmed bookings from paid booking failures", () => {
  const leads = [
    lead({ id: 1, createdAt: "2026-06-03T04:30:00Z" }),
    lead({
      id: 2,
      stage: "paid",
      amountPaise: 399900,
      paidAt: "2026-07-05T04:30:00Z",
    }),
    lead({
      id: 3,
      stage: "booked",
      amountPaise: 499900,
      paidAt: "2026-08-06T04:30:00Z",
      scheduledAt: "2026-08-15T10:30:00Z",
      calendlyStatus: "active",
    }),
    lead({
      id: 4,
      stage: "booked",
      amountPaise: 399900,
      paidAt: "2026-08-07T04:30:00Z",
      scheduledAt: "2026-08-10T10:30:00Z",
      calendlyStatus: "canceled",
    }),
  ];

  const summary = buildAnalyticsLifetimeSummary(leads, now);
  assert.equal(summary.revenuePaise, 1_299_700);
  assert.equal(summary.payments, 3);
  assert.equal(summary.confirmedBookings, 1);
  assert.equal(summary.paidWithoutConfirmedBooking, 2);
  assert.equal(summary.activeMonths, 3);
  assert.equal(summary.averageConfirmedBookingsPerMonth, 1 / 3);
  assert.equal(summary.averagePaymentPaise, 433_233);
});

test("operations trend defaults to three calendar months and counts event dates", () => {
  const leads = [
    lead({
      id: 1,
      amountPaise: 399900,
      paidAt: "2026-06-05T04:30:00Z",
    }),
    lead({
      id: 2,
      amountPaise: 499900,
      paidAt: "2026-07-06T04:30:00Z",
      bookedAt: "2026-07-07T04:30:00Z",
      scheduledAt: "2026-08-15T10:30:00Z",
      calendlyStatus: "active",
    }),
    lead({
      id: 3,
      amountPaise: 399900,
      paidAt: "2026-08-01T04:30:00Z",
    }),
    lead({
      id: 4,
      bookedAt: "2026-08-10T04:30:00Z",
      scheduledAt: "2026-08-20T10:30:00Z",
      calendlyStatus: "active",
    }),
    lead({
      id: 5,
      amountPaise: 399900,
      paidAt: "2026-08-11T04:30:00Z",
      bookedAt: "2026-08-11T05:30:00Z",
      scheduledAt: "2026-08-20T10:30:00Z",
      calendlyStatus: "canceled",
    }),
  ];

  const trend = buildAnalyticsOperationsTrend(leads, "3m", now);
  assert.deepEqual(trend.map((bucket) => bucket.label), ["Jun 26", "Jul 26", "Aug 26"]);
  assert.deepEqual(
    trend.map(({ confirmedBookings, paymentsReceived, paidWithoutBooking }) => ({
      confirmedBookings,
      paymentsReceived,
      paidWithoutBooking,
    })),
    [
      { confirmedBookings: 0, paymentsReceived: 1, paidWithoutBooking: 1 },
      { confirmedBookings: 1, paymentsReceived: 1, paidWithoutBooking: 0 },
      { confirmedBookings: 1, paymentsReceived: 2, paidWithoutBooking: 2 },
    ],
  );
});

test("15-day operations trend returns one IST calendar bucket per day", () => {
  const trend = buildAnalyticsOperationsTrend([], "15d", now);
  assert.equal(trend.length, 15);
  assert.equal(trend[0]?.label, "29 Jul");
  assert.equal(trend[14]?.label, "12 Aug");
  assert.equal(trend[14]?.end.toISOString(), now.toISOString());
});

test("all requested operations trend ranges have the expected bucket count", () => {
  const expected = {
    "1w": 7,
    "15d": 15,
    "1m": 30,
    "3m": 3,
    "6m": 6,
    "1y": 12,
    "3y": 3,
    "5y": 5,
    "10y": 10,
  } as const;
  for (const [range, count] of Object.entries(expected)) {
    assert.equal(
      buildAnalyticsOperationsTrend([], range as keyof typeof expected, now).length,
      count,
    );
  }
  assert.equal(buildAnalyticsOperationsTrend([], "10y", now)[0]?.label, "2017");
  assert.equal(normalizeAnalyticsTrendRange("6m"), "6m");
  assert.equal(normalizeAnalyticsTrendRange("unknown"), "3m");
});

test("rolling summary uses the same selected range as the trend", () => {
  const leads = [
    lead({
      id: 1,
      createdAt: "2026-08-05T04:30:00Z",
      stage: "paid",
      amountPaise: 399900,
      paidAt: "2026-08-05T04:30:00Z",
    }),
    lead({
      id: 2,
      createdAt: "2026-08-10T04:30:00Z",
      stage: "booked",
      amountPaise: 499900,
      paidAt: "2026-08-10T04:30:00Z",
      bookedAt: "2026-08-10T05:30:00Z",
      scheduledAt: "2026-08-15T10:30:00Z",
      calendlyStatus: "active",
    }),
  ];

  const week = buildAnalyticsTrendSummary(leads, "1w", now);
  assert.equal(week.label, "1 week");
  assert.equal(week.revenuePaise, 499900);
  assert.equal(week.payments, 1);
  assert.equal(week.scheduledRevenuePaise, 499900);
  assert.equal(week.awaitingTimeRevenuePaise, 0);
  assert.equal(week.cohortTotal, 1);

  const fifteenDays = buildAnalyticsTrendSummary(leads, "15d", now);
  assert.equal(fifteenDays.label, "15 days");
  assert.equal(fifteenDays.revenuePaise, 899800);
});
