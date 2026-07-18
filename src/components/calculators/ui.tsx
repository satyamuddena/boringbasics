"use client";

/** Shared bits for the fitness calculators. */
export const fieldCls =
  "w-full rounded-xl border border-line bg-ink px-4 py-3 text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function CalcCard({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-ink-card p-6 sm:p-8">
      <h2 className="font-display text-2xl uppercase">{title}</h2>
      <p className="mt-2 text-sm text-muted">{blurb}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldCls}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              value === o.value
                ? "border-accent bg-accent text-ink"
                : "border-line text-muted hover:border-accent/60"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-accent/40 bg-ink p-5 text-center shadow-glow">
      {children}
    </div>
  );
}
