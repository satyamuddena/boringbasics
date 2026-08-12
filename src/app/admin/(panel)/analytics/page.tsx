import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { AdminCard, AdminHeading, AdminTable, AdminTabs, StatusPill } from "@/components/admin/ui";
import { getDb, schema as t } from "@/db";
import {
  ANALYTICS_TREND_OPTIONS,
  bookingState,
  buildAnalyticsLifetimeSummary,
  buildAnalyticsOperationsTrend,
  buildAnalyticsReport,
  normalizeAnalyticsPeriod,
  normalizeAnalyticsTrendRange,
  type AnalyticsBucket,
  type AnalyticsPeriodOption,
  type AnalyticsRange,
  type AnalyticsTrendRange,
  type BookingState,
} from "@/lib/analytics";
import { bookingProgress } from "@/lib/bookingProgress";
import { formatDateTime } from "@/lib/datetime";
import { AnalyticsPeriodPicker } from "./AnalyticsPeriodPicker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics",
};

type AnalyticsView = "overview" | "bookings" | "revenue";
type LeadRow = typeof t.leads.$inferSelect;

const STATE_META: Record<
  BookingState,
  { label: string; hint: string; tone: string; tab: string }
> = {
  upcoming: {
    label: "Upcoming",
    hint: "Paid and scheduled",
    tone: "bg-ok",
    tab: "upcoming",
  },
  unpaid: {
    label: "Never paid",
    hint: "Form filled, payment missing",
    tone: "bg-warn",
    tab: "unpaid",
  },
  notime: {
    label: "No time picked",
    hint: "Paid, awaiting Calendly",
    tone: "bg-accent",
    tab: "notime",
  },
  closed: {
    label: "Closed / past",
    hint: "Finished, cancelled, or elapsed",
    tone: "bg-muted",
    tab: "closed",
  },
};

const STATE_ORDER: BookingState[] = ["upcoming", "unpaid", "notime", "closed"];

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function href({
  range,
  view,
  period,
  state,
  trend,
}: {
  range: AnalyticsRange;
  view: AnalyticsView;
  period: string;
  state?: BookingState;
  trend?: AnalyticsTrendRange;
}) {
  const params = new URLSearchParams({ range, view, period });
  if (state) params.set("state", state);
  if (trend) params.set("trend", trend);
  return `/admin/analytics?${params}`;
}

function yearInIst(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Number(
    new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" }).format(date),
  );
}

function periodOptions(
  leads: LeadRow[],
  now: Date,
) {
  const currentYear = Number(
    new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" }).format(now),
  );
  const dataYears = leads.flatMap((lead) =>
    [lead.createdAt, lead.paidAt, lead.scheduledAt]
      .map(yearInIst)
      .filter((year): year is number => year != null),
  );
  const firstYear = Math.min(currentYear, ...dataYears);
  const lastYear = Math.max(currentYear + 2, ...dataYears);
  const years: AnalyticsPeriodOption[] = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => {
      const year = firstYear + index;
      return { value: String(year), label: String(year) };
    },
  );
  const months: AnalyticsPeriodOption[] = years.flatMap(({ value }) =>
    Array.from({ length: 12 }, (_, month) => {
      const date = new Date(Date.UTC(Number(value), month, 15));
      return {
        value: `${value}-${String(month + 1).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          year: "2-digit",
          timeZone: "Asia/Kolkata",
        }).format(date),
      };
    }),
  );
  return { years, months };
}

function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function Metric({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const noteTone = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-muted";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-card p-4 sm:p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-accent"}`} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl text-fg sm:text-3xl">{value}</p>
      <p className={`mt-2 text-xs ${noteTone}`}>{note}</p>
    </div>
  );
}

function TrendChart({ buckets }: { buckets: AnalyticsBucket[] }) {
  const maxRevenue = Math.max(...buckets.map((bucket) => bucket.revenuePaise), 1);
  const maxPayments = Math.max(...buckets.map((bucket) => bucket.payments), 1);
  const minWidth = Math.max(420, buckets.length * 78);

  return (
    <div className="overflow-x-auto pb-1">
      <div
        className="grid h-64 items-end gap-3 border-b border-line px-2 pt-8"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(58px, 1fr))`, minWidth }}
        role="img"
        aria-label="Collected revenue bars with paid booking counts for each period"
      >
        {buckets.map((bucket) => {
          const revenueHeight = Math.max(3, (bucket.revenuePaise / maxRevenue) * 100);
          const paymentHeight = Math.max(3, (bucket.payments / maxPayments) * 100);
          return (
            <div key={bucket.key} className="grid h-full grid-rows-[1fr_auto] gap-2">
              <div className="relative flex h-full items-end justify-center gap-1">
                <div
                  className="w-7 rounded-t-lg bg-accent/80"
                  style={{ height: `${revenueHeight}%` }}
                  aria-label={`${bucket.label}: ${formatMoney(bucket.revenuePaise)} collected`}
                />
                <div
                  className="w-2 rounded-t bg-ok/70"
                  style={{ height: `${paymentHeight}%` }}
                  aria-label={`${bucket.label}: ${bucket.payments} payments`}
                />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted">
                  {formatMoney(bucket.revenuePaise)}
                </span>
              </div>
              <div className="pb-2 text-center">
                <p className="whitespace-nowrap text-[11px] text-muted">{bucket.label}</p>
                <p className="mt-0.5 text-[11px] text-ok">{bucket.payments} paid</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" />Revenue</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-ok" />Paid bookings</span>
      </div>
    </div>
  );
}

function OperationsTrendChart({
  buckets,
}: {
  buckets: ReturnType<typeof buildAnalyticsOperationsTrend>;
}) {
  const maxCount = Math.max(
    ...buckets.flatMap((bucket) => [
      bucket.confirmedBookings,
      bucket.paymentsReceived,
      bucket.paidWithoutBooking,
    ]),
    1,
  );
  const minWidth = Math.max(420, buckets.length * 76);
  const series = [
    { key: "confirmedBookings" as const, label: "Confirmed bookings", tone: "bg-ok" },
    { key: "paymentsReceived" as const, label: "Payments received", tone: "bg-accent" },
    { key: "paidWithoutBooking" as const, label: "Paid, not booked", tone: "bg-warn" },
  ];

  return (
    <div className="overflow-x-auto pb-1">
      <div
        className="grid h-64 items-end gap-2 border-b border-line px-2 pt-5"
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(66px, 1fr))`, minWidth }}
        role="img"
        aria-label="Confirmed bookings compared with payments received and paid bookings without a confirmed slot"
      >
        {buckets.map((bucket) => (
          <div key={bucket.key} className="grid h-full grid-rows-[1fr_auto] gap-2">
            <div className="flex h-full items-end justify-center gap-1.5">
              {series.map((item) => {
                const value = bucket[item.key];
                const height = value === 0 ? 0 : Math.max(6, (value / maxCount) * 100);
                return (
                  <div key={item.key} className="relative h-full w-3 sm:w-4">
                    <span
                      className="absolute left-1/2 -translate-x-1/2 text-[9px] text-muted"
                      style={{ bottom: `calc(${height}% + 3px)` }}
                    >
                      {value}
                    </span>
                    <span
                      className={`absolute inset-x-0 bottom-0 rounded-t ${item.tone}`}
                      style={{ height: `${height}%` }}
                      aria-label={`${bucket.label}: ${value} ${item.label.toLowerCase()}`}
                    />
                  </div>
                );
              })}
            </div>
            <p className="pb-2 text-center text-[11px] text-muted">{bucket.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${item.tone}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StateCards({
  report,
  range,
  period,
  selected,
}: {
  report: ReturnType<typeof buildAnalyticsReport>;
  range: AnalyticsRange;
  period: string;
  selected?: BookingState;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STATE_ORDER.map((state) => {
        const meta = STATE_META[state];
        const active = state === selected;
        return (
          <Link
            key={state}
            href={href({ range, view: "bookings", period, state })}
            aria-current={active ? "page" : undefined}
            className={`rounded-2xl border bg-ink-card p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active ? "border-accent" : "border-line hover:border-accent/60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.tone}`} />
              <span className="font-display text-2xl text-fg">{report.states[state]}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-fg">{meta.label}</p>
            <p className="mt-1 text-xs text-muted">{meta.hint}</p>
          </Link>
        );
      })}
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const range: AnalyticsRange = one(query.range) === "year" ? "year" : "month";
  const requestedView = one(query.view);
  const view: AnalyticsView =
    requestedView === "bookings" || requestedView === "revenue" ? requestedView : "overview";
  const requestedState = one(query.state);
  const state: BookingState = STATE_ORDER.includes(requestedState as BookingState)
    ? (requestedState as BookingState)
    : "upcoming";
  const trendRange = normalizeAnalyticsTrendRange(one(query.trend));

  const now = new Date();
  const db = getDb();
  const leads = db.select().from(t.leads).orderBy(desc(t.leads.id)).all();
  const period = normalizeAnalyticsPeriod(range, one(query.period), now);
  const report = buildAnalyticsReport(leads, range, now, period);
  const lifetime = buildAnalyticsLifetimeSummary(leads, now);
  const operationsTrend = buildAnalyticsOperationsTrend(leads, trendRange, now);
  const availablePeriods = periodOptions(leads, now);
  const stateLeads = report.cohort
    .filter((lead) => bookingState(lead, now) === state)
    .sort((a, b) => {
      if (state === "upcoming") {
        return (new Date(a.scheduledAt ?? 0).getTime() || 0) - (new Date(b.scheduledAt ?? 0).getTime() || 0);
      }
      return b.id - a.id;
    })
    .slice(0, 10);

  const tabs = [
    { key: "overview", label: "Overview", href: href({ range, view: "overview", period, trend: trendRange }) },
    { key: "bookings", label: "Booking states", href: href({ range, view: "bookings", period, state }) },
    { key: "revenue", label: "Revenue", href: href({ range, view: "revenue", period }) },
  ];
  const currentMonthPeriod = normalizeAnalyticsPeriod("month", null, now);

  return (
    <>
      <AdminHeading title="Analytics" />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-fg">{report.window.label}</p>
          <p className="mt-1 text-xs text-muted">Compared with {report.window.previousLabel} · INR only</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-ink-card p-1" aria-label="Reporting interval">
            {(["month", "year"] as const).map((item) => {
              const targetPeriod =
                item === "year"
                  ? period.slice(0, 4)
                  : range === "year"
                    ? `${period}-${currentMonthPeriod.slice(5)}`
                    : period;
              return (
                <Link
                  key={item}
                  href={href({ range: item, view, period: targetPeriod, state: view === "bookings" ? state : undefined, trend: view === "overview" ? trendRange : undefined })}
                  aria-current={range === item ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    range === item ? "bg-accent text-ink" : "text-muted hover:text-fg"
                  }`}
                >
                  {item === "month" ? "Monthly" : "Yearly"}
                </Link>
              );
            })}
          </div>
          <AnalyticsPeriodPicker
            range={range}
            view={view}
            state={view === "bookings" ? state : undefined}
            trend={view === "overview" ? trendRange : undefined}
            value={period}
            options={range === "month" ? availablePeriods.months : availablePeriods.years}
          />
          <a
            href="/api/admin/analytics/export"
            download
            className="inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-line bg-ink-card px-3 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Download raw CSV ↓
          </a>
        </div>
      </div>

      <AdminTabs tabs={tabs} active={view} surface="card" />

      <div className="rounded-b-2xl border border-t-0 border-line bg-ink-card p-4 sm:p-6">
        {view === "overview" && (
          <div className="space-y-6">
            <section>
              <div className="mb-3">
                <h2 className="font-display text-xl uppercase">Business totals</h2>
                <p className="mt-1 text-xs text-muted">All-time performance through today.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              <Metric
                label="Total revenue to date"
                value={formatMoney(lifetime.revenuePaise)}
                note={`${lifetime.payments.toLocaleString("en-IN")} successful payments`}
                tone="ok"
              />
              <Metric
                label="Total confirmed bookings"
                value={lifetime.confirmedBookings.toLocaleString("en-IN")}
                note="Active booking slot confirmed"
                tone="ok"
              />
              <Metric
                label="Paid but booking failed"
                value={lifetime.paidWithoutConfirmedBooking.toLocaleString("en-IN")}
                note="Paid, but no active confirmed slot"
                tone={lifetime.paidWithoutConfirmedBooking > 0 ? "warn" : "ok"}
              />
              <Metric
                label="Average bookings / month"
                value={lifetime.averageConfirmedBookingsPerMonth.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                note={`${lifetime.activeMonths.toLocaleString("en-IN")} active months to date`}
              />
              <Metric
                label="Average payment to date"
                value={formatMoney(lifetime.averagePaymentPaise)}
                note="Across all successful payments"
              />
              </div>
            </section>

            <AdminCard className="min-w-0">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl uppercase">Booking vs payment trend</h2>
                  <p className="mt-1 text-xs text-muted">
                    Confirmed booking events compared with successful payments and paid bookings still missing a slot.
                  </p>
                </div>
                <div className="flex max-w-full flex-wrap gap-1 rounded-lg border border-line bg-ink p-1" aria-label="Trend period">
                  {ANALYTICS_TREND_OPTIONS.map((option) => (
                    <Link
                      key={option.value}
                      href={href({ range, view: "overview", period, trend: option.value })}
                      aria-current={trendRange === option.value ? "page" : undefined}
                      scroll={false}
                      className={`flex-none whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        trendRange === option.value ? "bg-accent text-ink" : "text-muted hover:text-fg"
                      }`}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
              <OperationsTrendChart buckets={operationsTrend} />
            </AdminCard>

            <AdminCard
              title={range === "month" ? `Monthly report · ${report.window.label}` : `Yearly report · ${report.window.label}`}
              className="min-w-0"
            >
              <div className="mb-5 grid gap-3 border-b border-line pb-5 sm:grid-cols-3">
                <div><p className="text-xs text-muted">Revenue</p><p className="mt-1 font-display text-xl text-fg">{formatMoney(report.revenuePaise)}</p></div>
                <div><p className="text-xs text-muted">Payments</p><p className="mt-1 font-display text-xl text-fg">{report.payments.toLocaleString("en-IN")}</p></div>
                <div><p className="text-xs text-muted">Confirmed from new leads</p><p className="mt-1 font-display text-xl text-fg">{report.funnel.timePicked.toLocaleString("en-IN")}</p></div>
              </div>
              {report.buckets.length ? <TrendChart buckets={report.buckets} /> : <p className="text-sm text-muted">No payment activity in this period.</p>}
            </AdminCard>

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl uppercase">Current booking states</h2>
                  <p className="mt-1 text-xs text-muted">{report.cohortTotal} leads entered during {report.window.label}.</p>
                </div>
                <Link href={href({ range, view: "bookings", period, state: "unpaid" })} className="text-xs text-accent underline">
                  {report.needsFollowup} need follow-up →
                </Link>
              </div>
              <StateCards report={report} range={range} period={period} />
            </section>
          </div>
        )}

        {view === "bookings" && (
          <div className="space-y-5">
            <StateCards report={report} range={range} period={period} selected={state} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl uppercase">{STATE_META[state].label}</h2>
                <p className="mt-1 text-xs text-muted">Showing up to 10 bookings from {report.window.label}.</p>
              </div>
              <Link href={`/admin/leads?tab=${STATE_META[state].tab}`} className="text-xs text-accent underline">
                Open full booking queue →
              </Link>
            </div>
            <AdminTable headers={["Client", "What is happening", "Relevant date", "Amount", ""]} empty={`No ${STATE_META[state].label.toLowerCase()} bookings in this period.`}>
              {stateLeads.map((lead) => {
                const progress = bookingProgress(lead, now.getTime());
                const relevantDate =
                  state === "upcoming"
                    ? lead.scheduledAt
                    : state === "notime"
                      ? lead.paidAt
                      : state === "unpaid"
                        ? lead.createdAt
                        : lead.scheduledAt ?? lead.bookedAt ?? lead.createdAt;
                return (
                  <tr key={lead.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{lead.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{lead.whatsapp}</p>
                    </td>
                    <td className="px-4 py-3"><StatusPill value={lead.stage} label={progress.headline} /></td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(relevantDate)}</td>
                    <td className="px-4 py-3 text-fg">{lead.amountPaise ? formatMoney(lead.amountPaise) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/leads?q=${encodeURIComponent(lead.name)}`} className="text-xs text-accent underline">Open</Link>
                    </td>
                  </tr>
                );
              })}
            </AdminTable>
          </div>
        )}

        {view === "revenue" && (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.7fr)]">
              <AdminCard title={range === "month" ? "Revenue by week" : "Revenue by month"} className="min-w-0">
                {report.buckets.length ? <TrendChart buckets={report.buckets} /> : <p className="text-sm text-muted">No successful payments in this period.</p>}
              </AdminCard>
              <AdminCard title="Payment summary" className="min-w-0">
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted">Collected</dt><dd className="font-medium text-fg">{formatMoney(report.revenuePaise)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Payments</dt><dd className="font-medium text-fg">{report.payments}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Average payment</dt><dd className="font-medium text-fg">{formatMoney(report.averagePaymentPaise)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Paid, no active time</dt><dd className="font-medium text-warn">{formatMoney(report.awaitingTimeRevenuePaise)}</dd></div>
                  <div className="flex justify-between gap-3 border-t border-line pt-4"><dt className="text-muted">Scheduled revenue</dt><dd className="font-medium text-ok">{formatMoney(report.scheduledRevenuePaise)}</dd></div>
                </dl>
              </AdminCard>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl uppercase">Latest payments</h2>
                <Link href="/admin/leads?sort=newest" className="text-xs text-accent underline">View bookings →</Link>
              </div>
              <AdminTable headers={["Client", "Paid", "Booking state", "Amount", ""]} empty="No successful payments in this period.">
                {report.latestPayments.map((lead) => {
                  const leadState = bookingState(lead, now);
                  return (
                    <tr key={lead.id}>
                      <td className="px-4 py-3 font-medium text-fg">{lead.name}</td>
                      <td className="px-4 py-3 text-muted">{formatDateTime(lead.paidAt)}</td>
                      <td className="px-4 py-3"><StatusPill value={leadState} label={STATE_META[leadState].label} /></td>
                      <td className="px-4 py-3 text-fg">{formatMoney(lead.amountPaise ?? 0)}</td>
                      <td className="px-4 py-3 text-right"><Link href={`/admin/leads?q=${encodeURIComponent(lead.name)}`} className="text-xs text-accent underline">Open</Link></td>
                    </tr>
                  );
                })}
              </AdminTable>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
