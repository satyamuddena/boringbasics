import { bookingProgress } from "@/lib/bookingProgress";

export type AnalyticsRange = "month" | "year";
export type BookingState = "upcoming" | "unpaid" | "notime" | "closed";
export type AnalyticsTrendRange =
  | "1w"
  | "15d"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "3y"
  | "5y"
  | "10y";

export const ANALYTICS_TREND_OPTIONS: Array<{
  value: AnalyticsTrendRange;
  label: string;
}> = [
  { value: "1w", label: "1 week" },
  { value: "15d", label: "15 days" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "3y", label: "3 years" },
  { value: "5y", label: "5 years" },
  { value: "10y", label: "10 years" },
];

export interface AnalyticsLead {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
  goal: string | null;
  status: string;
  stage: string;
  amountPaise: number | null;
  currency: string | null;
  paidAt: string | null;
  bookedAt: string | null;
  scheduledAt: string | null;
  calendlyStatus: string | null;
  createdAt: string;
}

export interface AnalyticsBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  revenuePaise: number;
  payments: number;
}

export interface AnalyticsWindow {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
  previousLabel: string;
}

export interface AnalyticsPeriodOption {
  value: string;
  label: string;
}

export interface AnalyticsReport {
  range: AnalyticsRange;
  window: AnalyticsWindow;
  currency: "INR";
  revenuePaise: number;
  previousRevenuePaise: number;
  payments: number;
  previousPayments: number;
  averagePaymentPaise: number;
  previousAveragePaymentPaise: number;
  conversionRate: number;
  previousConversionRate: number;
  funnel: {
    formFilled: number;
    paid: number;
    timePicked: number;
    callDone: number;
  };
  states: Record<BookingState, number>;
  cohortTotal: number;
  needsFollowup: number;
  scheduledRevenuePaise: number;
  awaitingTimeRevenuePaise: number;
  buckets: AnalyticsBucket[];
  cohort: AnalyticsLead[];
  latestPayments: AnalyticsLead[];
}

export interface AnalyticsLifetimeSummary {
  revenuePaise: number;
  payments: number;
  confirmedBookings: number;
  paidWithoutConfirmedBooking: number;
  averageConfirmedBookingsPerMonth: number;
  averagePaymentPaise: number;
  activeMonths: number;
}

export interface AnalyticsOperationsTrendBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  confirmedBookings: number;
  paymentsReceived: number;
  paidWithoutBooking: number;
}

const IST_OFFSET_MS = 330 * 60 * 1000;

function istDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  return new Date(
    Date.UTC(year, month, day, hour, minute, second, millisecond) - IST_OFFSET_MS,
  );
}

function istParts(value: Date) {
  const shifted = new Date(value.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  };
}

function validTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function inWindow(value: string | null | undefined, start: Date, end: Date) {
  const time = validTime(value);
  return time != null && time >= start.getTime() && time < end.getTime();
}

function paymentAmount(lead: AnalyticsLead) {
  return (lead.currency ?? "INR") === "INR" ? Math.max(0, lead.amountPaise ?? 0) : 0;
}

function isPaid(lead: AnalyticsLead) {
  return validTime(lead.paidAt) != null && paymentAmount(lead) > 0;
}

function hasTime(lead: AnalyticsLead) {
  return validTime(lead.scheduledAt) != null;
}

function callIsDone(lead: AnalyticsLead, now: Date) {
  const scheduled = validTime(lead.scheduledAt);
  return lead.status === "closed" && scheduled != null && scheduled < now.getTime();
}

export function bookingState(lead: AnalyticsLead, now: Date): BookingState {
  const scheduled = validTime(lead.scheduledAt);
  const cancelled = lead.calendlyStatus === "canceled";

  if (
    lead.status === "closed" ||
    cancelled ||
    (lead.stage === "booked" && scheduled != null && scheduled < now.getTime())
  ) {
    return "closed";
  }
  if (lead.stage === "booked" && scheduled != null) return "upcoming";
  if (lead.stage === "paid" || lead.stage === "booked") return "notime";
  return "unpaid";
}

export function normalizeAnalyticsPeriod(
  range: AnalyticsRange,
  value: string | null | undefined,
  now = new Date(),
) {
  const current = istParts(now);
  if (range === "year") {
    return /^\d{4}$/.test(value ?? "") ? value! : String(current.year);
  }
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")
    ? value!
    : `${current.year}-${String(current.month + 1).padStart(2, "0")}`;
}

export function normalizeAnalyticsTrendRange(
  value: string | null | undefined,
): AnalyticsTrendRange {
  return ANALYTICS_TREND_OPTIONS.some((option) => option.value === value)
    ? (value as AnalyticsTrendRange)
    : "3m";
}

export function analyticsWindow(
  range: AnalyticsRange,
  now = new Date(),
  selectedPeriod?: string,
): AnalyticsWindow {
  const current = istParts(now);
  const period = normalizeAnalyticsPeriod(range, selectedPeriod, now);

  if (range === "year") {
    const year = Number(period);
    const start = istDate(year, 0, 1);
    const naturalEnd = istDate(year + 1, 0, 1);
    const isCurrent = year === current.year;
    const end = isCurrent ? now : naturalEnd;
    const previousStart = istDate(year - 1, 0, 1);
    const previousEnd = isCurrent
      ? istDate(
          year - 1,
          current.month,
          current.day,
          current.hour,
          current.minute,
          current.second,
          current.millisecond,
        )
      : start;
    return {
      start,
      end,
      previousStart,
      previousEnd,
      label: isCurrent ? `${year} year to date` : String(year),
      previousLabel: isCurrent ? `same period in ${year - 1}` : String(year - 1),
    };
  }

  const [yearText, monthText] = period.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = istDate(year, monthIndex, 1);
  const naturalEnd = istDate(year, monthIndex + 1, 1);
  const isCurrent = year === current.year && monthIndex === current.month;
  const end = isCurrent ? now : naturalEnd;
  const previousStart = istDate(year, monthIndex - 1, 1);
  const previousEnd = isCurrent
    ? new Date(
        Math.min(previousStart.getTime() + (now.getTime() - start.getTime()), start.getTime()),
      )
    : start;
  const month = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(start);
  const previousMonth = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(previousStart);
  return {
    start,
    end,
    previousStart,
    previousEnd,
    label: month,
    previousLabel: `same period in ${previousMonth}`,
  };
}

function bucketWindows(range: AnalyticsRange, window: AnalyticsWindow) {
  const p = istParts(window.start);
  if (range === "year") {
    const last = istParts(new Date(window.end.getTime() - 1));
    return Array.from({ length: last.month + 1 }, (_, month) => {
      const start = istDate(p.year, month, 1);
      const naturalEnd = istDate(p.year, month + 1, 1);
      return {
        key: `${p.year}-${String(month + 1).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "2-digit",
          timeZone: "Asia/Kolkata",
        }).format(start),
        start,
        end: new Date(Math.min(naturalEnd.getTime(), window.end.getTime())),
      };
    });
  }

  const last = istParts(new Date(window.end.getTime() - 1));
  const starts = [1, 8, 15, 22, 29].filter((day) => day <= last.day);
  const monthShort = new Intl.DateTimeFormat("en-IN", {
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(window.start);
  return starts.map((day) => {
    const start = istDate(p.year, p.month, day);
    const naturalEnd = istDate(p.year, p.month, day + 7);
    const end = new Date(Math.min(naturalEnd.getTime(), window.end.getTime()));
    const endDay = istParts(new Date(end.getTime() - 1)).day;
    return {
      key: `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: `${day}–${endDay} ${monthShort}`,
      start,
      end,
    };
  });
}

function sumsForWindow(leads: AnalyticsLead[], start: Date, end: Date) {
  const paid = leads.filter((lead) => isPaid(lead) && inWindow(lead.paidAt, start, end));
  const revenuePaise = paid.reduce((sum, lead) => sum + paymentAmount(lead), 0);
  return {
    paid,
    revenuePaise,
    averagePaymentPaise: paid.length ? Math.round(revenuePaise / paid.length) : 0,
  };
}

function cohortForWindow(leads: AnalyticsLead[], start: Date, end: Date) {
  return leads.filter((lead) => inWindow(lead.createdAt, start, end));
}

function conversionForCohort(leads: AnalyticsLead[]) {
  if (!leads.length) return 0;
  return (leads.filter(hasTime).length / leads.length) * 100;
}

function monthSerial(value: Date) {
  const parts = istParts(value);
  return parts.year * 12 + parts.month;
}

export function buildAnalyticsLifetimeSummary(
  leads: AnalyticsLead[],
  now = new Date(),
): AnalyticsLifetimeSummary {
  const paid = leads.filter(isPaid);
  const revenuePaise = paid.reduce((sum, lead) => sum + paymentAmount(lead), 0);
  const confirmed = leads.filter(
    (lead) => hasTime(lead) && lead.calendlyStatus !== "canceled",
  );
  const paidWithoutConfirmedBooking = paid.filter(
    (lead) => !hasTime(lead) || lead.calendlyStatus === "canceled",
  ).length;
  const firstLeadTime = leads
    .map((lead) => validTime(lead.createdAt))
    .filter((time): time is number => time != null)
    .sort((a, b) => a - b)[0];
  const activeMonths = firstLeadTime == null
    ? 0
    : Math.max(1, monthSerial(now) - monthSerial(new Date(firstLeadTime)) + 1);

  return {
    revenuePaise,
    payments: paid.length,
    confirmedBookings: confirmed.length,
    paidWithoutConfirmedBooking,
    averageConfirmedBookingsPerMonth: activeMonths ? confirmed.length / activeMonths : 0,
    averagePaymentPaise: paid.length ? Math.round(revenuePaise / paid.length) : 0,
    activeMonths,
  };
}

export function buildAnalyticsOperationsTrend(
  leads: AnalyticsLead[],
  range: AnalyticsTrendRange = "3m",
  now = new Date(),
): AnalyticsOperationsTrendBucket[] {
  const current = istParts(now);
  const config: Record<
    AnalyticsTrendRange,
    { unit: "day" | "month" | "year"; count: number }
  > = {
    "1w": { unit: "day", count: 7 },
    "15d": { unit: "day", count: 15 },
    "1m": { unit: "day", count: 30 },
    "3m": { unit: "month", count: 3 },
    "6m": { unit: "month", count: 6 },
    "1y": { unit: "month", count: 12 },
    "3y": { unit: "year", count: 3 },
    "5y": { unit: "year", count: 5 },
    "10y": { unit: "year", count: 10 },
  };
  const selected = config[range];
  const windows = selected.unit === "day"
    ? Array.from({ length: selected.count }, (_, index) => {
        const daysAgo = selected.count - 1 - index;
        const start = istDate(current.year, current.month, current.day - daysAgo);
        const naturalEnd = istDate(current.year, current.month, current.day - daysAgo + 1);
        return {
          key: start.toISOString().slice(0, 10),
          label: new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          }).format(start),
          start,
          end: new Date(Math.min(naturalEnd.getTime(), now.getTime())),
        };
      })
    : selected.unit === "month"
      ? Array.from({ length: selected.count }, (_, index) => {
        const month = current.month - (selected.count - 1 - index);
        const start = istDate(current.year, month, 1);
        const naturalEnd = istDate(current.year, month + 1, 1);
        return {
          key: `${istParts(start).year}-${String(istParts(start).month + 1).padStart(2, "0")}`,
          label: new Intl.DateTimeFormat("en-IN", {
            month: "short",
            year: "2-digit",
            timeZone: "Asia/Kolkata",
          }).format(start),
          start,
          end: new Date(Math.min(naturalEnd.getTime(), now.getTime())),
        };
      })
      : Array.from({ length: selected.count }, (_, index) => {
        const year = current.year - (selected.count - 1 - index);
        const start = istDate(year, 0, 1);
        const naturalEnd = istDate(year + 1, 0, 1);
        return {
          key: String(year),
          label: String(year),
          start,
          end: new Date(Math.min(naturalEnd.getTime(), now.getTime())),
        };
      });

  return windows.map((window) => {
    const confirmedBookings = leads.filter(
      (lead) =>
        hasTime(lead) &&
        lead.calendlyStatus !== "canceled" &&
        inWindow(lead.bookedAt ?? lead.scheduledAt, window.start, window.end),
    ).length;
    const payments = leads.filter(
      (lead) => isPaid(lead) && inWindow(lead.paidAt, window.start, window.end),
    );
    return {
      ...window,
      confirmedBookings,
      paymentsReceived: payments.length,
      paidWithoutBooking: payments.filter(
        (lead) => !hasTime(lead) || lead.calendlyStatus === "canceled",
      ).length,
    };
  });
}

export function buildAnalyticsReport(
  leads: AnalyticsLead[],
  range: AnalyticsRange,
  now = new Date(),
  selectedPeriod?: string,
): AnalyticsReport {
  const window = analyticsWindow(range, now, selectedPeriod);
  const current = sumsForWindow(leads, window.start, window.end);
  const previous = sumsForWindow(leads, window.previousStart, window.previousEnd);
  const cohort = cohortForWindow(leads, window.start, window.end);
  const previousCohort = cohortForWindow(leads, window.previousStart, window.previousEnd);

  const states: Record<BookingState, number> = {
    upcoming: 0,
    unpaid: 0,
    notime: 0,
    closed: 0,
  };
  for (const lead of cohort) states[bookingState(lead, now)] += 1;

  const funnel = {
    formFilled: cohort.length,
    paid: cohort.filter(isPaid).length,
    timePicked: cohort.filter(hasTime).length,
    callDone: cohort.filter((lead) => callIsDone(lead, now)).length,
  };

  const buckets = bucketWindows(range, window).map((bucket) => {
    const sums = sumsForWindow(leads, bucket.start, bucket.end);
    return { ...bucket, revenuePaise: sums.revenuePaise, payments: sums.paid.length };
  });

  const scheduledRevenuePaise = current.paid.reduce(
    (sum, lead) => sum + (hasTime(lead) && lead.calendlyStatus !== "canceled" ? paymentAmount(lead) : 0),
    0,
  );

  return {
    range,
    window,
    currency: "INR",
    revenuePaise: current.revenuePaise,
    previousRevenuePaise: previous.revenuePaise,
    payments: current.paid.length,
    previousPayments: previous.paid.length,
    averagePaymentPaise: current.averagePaymentPaise,
    previousAveragePaymentPaise: previous.averagePaymentPaise,
    conversionRate: conversionForCohort(cohort),
    previousConversionRate: conversionForCohort(previousCohort),
    funnel,
    states,
    cohortTotal: cohort.length,
    needsFollowup: cohort.filter((lead) => bookingProgress(lead, now.getTime()).needsFollowup).length,
    scheduledRevenuePaise,
    awaitingTimeRevenuePaise: current.revenuePaise - scheduledRevenuePaise,
    buckets,
    cohort,
    latestPayments: current.paid
      .slice()
      .sort((a, b) => (validTime(b.paidAt) ?? 0) - (validTime(a.paidAt) ?? 0))
      .slice(0, 6),
  };
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
