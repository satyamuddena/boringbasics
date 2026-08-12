import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { AdminCard, AdminHeading } from "@/components/admin/ui";
import { getDb, schema as t } from "@/db";
import {
  ANALYTICS_TREND_OPTIONS,
  buildAnalyticsLifetimeSummary,
  buildAnalyticsOperationsTrend,
  buildAnalyticsTrendSummary,
  normalizeAnalyticsTrendRange,
  type AnalyticsTrendRange,
  type BookingState,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics",
};

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

function href(trend: AnalyticsTrendRange) {
  const params = new URLSearchParams({ trend });
  return `/admin/analytics?${params}`;
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
  summary,
}: {
  summary: ReturnType<typeof buildAnalyticsTrendSummary>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STATE_ORDER.map((state) => {
        const meta = STATE_META[state];
        return (
          <Link
            key={state}
            href={`/admin/leads?tab=${meta.tab}`}
            className="rounded-2xl border border-line bg-ink-card p-4 transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.tone}`} />
              <span className="font-display text-2xl text-fg">{summary.states[state]}</span>
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
  const trendRange = normalizeAnalyticsTrendRange(one(query.trend));

  const now = new Date();
  const db = getDb();
  const leads = db.select().from(t.leads).orderBy(desc(t.leads.id)).all();
  const lifetime = buildAnalyticsLifetimeSummary(leads, now);
  const operationsTrend = buildAnalyticsOperationsTrend(leads, trendRange, now);
  const trendSummary = buildAnalyticsTrendSummary(leads, trendRange, now);

  return (
    <>
      <AdminHeading
        title="Analytics"
        action={{ href: "/api/admin/analytics/export", label: "Download raw CSV ↓" }}
      />

      <div className="space-y-6">
        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl uppercase">All-time business totals</h2>
            <p className="mt-1 text-xs text-muted">Lifetime performance through today.</p>
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
              <h2 className="font-display text-xl uppercase">Rolling booking and payment trend</h2>
              <p className="mt-1 text-xs text-muted">Counts and revenue summary use the rolling range selected below.</p>
            </div>
            <div className="flex max-w-full flex-wrap gap-1 rounded-lg border border-line bg-ink p-1" aria-label="Trend period">
              {ANALYTICS_TREND_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={href(option.value)}
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

        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl uppercase">Selected-period revenue</h2>
            <p className="mt-1 text-xs text-muted">Revenue performance for the last {trendSummary.label.toLowerCase()}.</p>
          </div>
          <AdminCard title="Selected-period summary" className="min-w-0">
              <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-5">
                <div className="flex justify-between gap-3"><dt className="text-muted">Collected</dt><dd className="font-medium text-fg">{formatMoney(trendSummary.revenuePaise)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Payments</dt><dd className="font-medium text-fg">{trendSummary.payments}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Average payment</dt><dd className="font-medium text-fg">{formatMoney(trendSummary.averagePaymentPaise)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Paid, no confirmed slot</dt><dd className="font-medium text-warn">{formatMoney(trendSummary.awaitingTimeRevenuePaise)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Confirmed-slot revenue</dt><dd className="font-medium text-ok">{formatMoney(trendSummary.scheduledRevenuePaise)}</dd></div>
              </dl>
          </AdminCard>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl uppercase">Booking states</h2>
              <p className="mt-1 text-xs text-muted">{trendSummary.cohortTotal} leads entered during the last {trendSummary.label.toLowerCase()}.</p>
            </div>
            <Link href="/admin/leads?tab=needs_you" className="text-xs text-accent underline">
              {trendSummary.needsFollowup} need follow-up →
            </Link>
          </div>
          <StateCards summary={trendSummary} />
        </section>
      </div>
    </>
  );
}
