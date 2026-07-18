import Link from "next/link";
import type { ReactNode } from "react";

/* Shared admin UI primitives — same design tokens as the public site. */

export function AdminCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-card p-6">
      {title && <h2 className="mb-4 font-display text-xl uppercase">{title}</h2>}
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted/70">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-muted/50 focus:border-accent focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-24 ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Checkbox({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <input type="checkbox" {...props} className="h-4 w-4 accent-[#ff5722]" />
      {label}
    </label>
  );
}

export function SubmitButton({ children = "Save" }: { children?: ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
    >
      {children}
    </button>
  );
}

export function AdminListControls({
  children,
  resetHref,
}: {
  children: ReactNode;
  resetHref: string;
}) {
  return (
    <form className="mb-4 rounded-2xl border border-line bg-ink-card p-4">
      <div className="grid gap-3 md:grid-cols-4">{children}</div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
        >
          Apply
        </button>
        <Link
          href={resetHref}
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

export function AdminHeading({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="font-display text-3xl uppercase">{title}</h1>
      {action && (
        <Link
          href={action.href}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-ink-soft text-xs uppercase tracking-wider text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-ink-card">{children}</tbody>
      </table>
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  const tone =
    {
      published: "text-ok border-ok/40",
      confirmed: "text-ok border-ok/40",
      paid: "text-ok border-ok/40",
      new: "text-accent border-accent/40",
      popular: "text-accent border-accent/40",
      created: "text-accent border-accent/40",
      pending_payment: "text-warn border-warn/40",
      contacted: "text-warn border-warn/40",
      draft: "text-muted border-line",
      closed: "text-muted border-line",
      completed: "text-muted border-line",
      cancelled: "text-bad border-bad/40",
      failed: "text-bad border-bad/40",
    }[value] ?? "text-muted border-line";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}
