"use client";

import { useState } from "react";

export interface StatRow {
  label: string;
  value: number | "";
  suffix: string;
  prefix: string;
}

const inputClass =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-muted/50 focus:border-accent focus:outline-none";

/**
 * Structured editor for the homepage stats bar — no free-text format to break.
 * Serializes to a hidden JSON input read by the server action.
 */
export function StatsEditor({ name, initial }: { name: string; initial: StatRow[] }) {
  const [rows, setRows] = useState<StatRow[]>(
    initial.length ? initial : [{ label: "", value: "", suffix: "", prefix: "" }],
  );

  const update = (i: number, patch: Partial<StatRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const clean = rows
    .filter((r) => r.label.trim() && r.value !== "" && Number.isFinite(Number(r.value)))
    .map((r, i) => ({
      label: r.label.trim(),
      value: Number(r.value),
      suffix: r.suffix.trim() || null,
      prefix: r.prefix.trim() || null,
      displayOrder: i,
    }));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(clean)} />
      <div className="hidden grid-cols-[1fr_90px_70px_70px_36px] gap-2 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
        <span>Label</span>
        <span>Value</span>
        <span>Prefix</span>
        <span>Suffix</span>
        <span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_90px_70px_70px_36px]">
          <input
            className={`${inputClass} col-span-2 sm:col-span-1`}
            placeholder="e.g. Clients Transformed"
            value={r.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className={inputClass}
            type="number"
            placeholder="500"
            value={r.value}
            onChange={(e) => update(i, { value: e.target.value === "" ? "" : Number(e.target.value) })}
          />
          <input
            className={inputClass}
            placeholder="₹"
            maxLength={4}
            value={r.prefix}
            onChange={(e) => update(i, { prefix: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="+"
            maxLength={4}
            value={r.suffix}
            onChange={(e) => update(i, { suffix: e.target.value })}
          />
          <button
            type="button"
            aria-label="Remove stat"
            onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            className="flex h-9 w-9 items-center justify-center self-center rounded-lg border border-line text-muted hover:border-bad/60 hover:text-bad"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, { label: "", value: "", suffix: "", prefix: "" }])}
        className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
      >
        + Add stat
      </button>
    </div>
  );
}
