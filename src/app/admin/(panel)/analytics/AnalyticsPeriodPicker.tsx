"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AnalyticsPeriodOption,
  AnalyticsRange,
  AnalyticsTrendRange,
  BookingState,
} from "@/lib/analytics";

export function AnalyticsPeriodPicker({
  range,
  view,
  state,
  trend,
  value,
  options,
}: {
  range: AnalyticsRange;
  view: "overview" | "bookings" | "revenue";
  state?: BookingState;
  trend?: AnalyticsTrendRange;
  value: string;
  options: AnalyticsPeriodOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="block">
      <span className="sr-only">{range === "month" ? "Reporting month" : "Reporting year"}</span>
      <select
        value={value}
        disabled={pending}
        aria-label={range === "month" ? "Reporting month" : "Reporting year"}
        onChange={(event) => {
          const params = new URLSearchParams({ range, view, period: event.target.value });
          if (state) params.set("state", state);
          if (trend) params.set("trend", trend);
          startTransition(() => router.push(`/admin/analytics?${params}`, { scroll: false }));
        }}
        className="h-9 min-w-28 rounded-lg border border-line bg-ink-card px-3 text-xs font-semibold text-fg outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
