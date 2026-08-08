import Link from "next/link";
import { Children, type ComponentProps, type ReactNode } from "react";
import { MOBILE_BAR_OFFSET, SECTION_ANCHOR_OFFSET } from "@/lib/adminChrome";

/* Shared admin UI primitives — same design tokens as the public site.
 *
 * Radius scale. Every admin surface picks one of four tiers by what it *is*,
 * not by how big it looks:
 *
 *   rounded-2xl  outer surface   — card, table, list controls
 *   rounded-xl   inset panel     — alert, preview box, a panel nested in a card
 *   rounded-lg   control         — button, input, select, textarea
 *   rounded-full pill            — status pill, filter chip
 *
 * Anything reaching for a radius should be one of these, so a nested panel
 * never reads as a card and a card never reads as a button.
 */

/* ── Class constants ──────────────────────────────────────────────────────
 *
 * Exported because these strings used to be re-typed at every call site and
 * drifted: the primary button existed in five copies, the input in four. Import
 * the constant rather than pasting the classes.
 */

/** Focus ring for controls that sit on the page background. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export const btnPrimary =
  `inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const btnSecondary =
  `inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

/** The second button of a primary pair — still the accent, but outlined. */
export const btnAccentOutline =
  `inline-flex items-center justify-center gap-2 rounded-lg border border-accent px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

/**
 * The compact bordered action used in table rows, booking cards and the details
 * modal. Size classes are deliberately left to the caller — this appears at
 * three densities (`px-2 py-1 text-xs` in a row, `px-3 py-1.5 text-sm` in the
 * modal, `px-3 py-2 text-xs` on the push banner) and pinning one would change
 * the layout of the other two.
 */
export const btnGhost =
  `rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`;

export const btnDanger =
  `inline-flex items-center justify-center rounded-lg border border-bad/40 px-3 py-1.5 text-xs text-bad transition-colors hover:bg-bad/10 ${focusRing}`;

/** Compact primary — the Apply button on the filter bar and heading actions. */
export const btnPrimarySm =
  `inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const inputClass =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export const fieldLabelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-muted";

export const fieldHintClass = "mt-1 block text-xs text-muted";

/* ── Surfaces ─────────────────────────────────────────────────────────────*/

export function AdminCard({
  title,
  children,
  /** Square off the top so a tab bar can sit flush against it. */
  flush = false,
  className = "",
  id,
}: {
  title?: string;
  children: ReactNode;
  flush?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      // An id means something jumps here, so the card owns the offset that keeps
      // it from landing behind the mobile bar and the sticky section nav.
      className={`border border-line bg-ink-card p-4 sm:p-6 ${
        flush ? "rounded-b-2xl border-t-0" : "rounded-2xl"
      } ${id ? SECTION_ANCHOR_OFFSET : ""} ${className}`}
    >
      {title && <h2 className="mb-4 font-display text-xl uppercase">{title}</h2>}
      {children}
    </div>
  );
}

/**
 * A card whose body collapses. Used by the add/edit forms on the list pages so
 * the list itself is the first thing on screen.
 *
 * Native `<details>` on purpose: `open` is decided on the server from the URL,
 * so the right panel is expanded in the very first paint with no JavaScript and
 * no hydration flash. Because the collapsed content is a *separate* `<form>`,
 * hiding it can never block another form's validation.
 */
export function AdminDisclosureCard({
  title,
  open = false,
  children,
  className = "",
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      open={open}
      className={`group rounded-2xl border border-line bg-ink-card ${className}`}
    >
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-6 ${focusRing} rounded-2xl [&::-webkit-details-marker]:hidden`}
      >
        <h2 className="font-display text-xl uppercase">{title}</h2>
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
    </details>
  );
}

const alertTones = {
  ok: "border-ok/40 bg-ok/10 text-ok",
  bad: "border-bad/40 bg-bad/10 text-bad",
  warn: "border-warn/40 bg-warn/10 text-warn",
  info: "border-line bg-ink-card text-muted",
} as const;

/**
 * The page-level status banner. Replaces ~15 hand-rolled copies that had drifted
 * into three tones, two paddings and two radii.
 */
export function AdminAlert({
  tone = "info",
  children,
  className = "mb-4",
}: {
  tone?: keyof typeof alertTones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${alertTones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Form controls ────────────────────────────────────────────────────────*/

/**
 * Label + control. Renders a `<label>` wrapping its child, so it is only
 * correct for a *single* control — use `FieldGroup` for several.
 */
export function Field({
  label,
  hint,
  tooltip,
  children,
}: {
  label: string;
  hint?: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={fieldLabelClass}>
        {label}
        {tooltip && (
          <span
            tabIndex={0}
            title={tooltip}
            aria-label={`${label}: ${tooltip}`}
            className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-muted/60 text-[10px] normal-case tracking-normal text-muted"
          >
            ?
          </span>
        )}
      </span>
      {children}
      {hint && <span className={fieldHintClass}>{hint}</span>}
    </label>
  );
}

/**
 * Same look as `Field`, but a `<div>` + `<span>` instead of a `<label>`.
 *
 * A single `<label>` can only ever be associated with one control, so wrapping
 * a group (the four day/time selects under "Available slots", the goal-tag
 * checkboxes) in `Field` silently mis-associates the label for screen readers
 * and makes clicking the label focus an arbitrary member of the group.
 */
export function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className={fieldLabelClass}>{label}</span>
      {children}
      {hint && <span className={fieldHintClass}>{hint}</span>}
    </div>
  );
}

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
      {/* The token, not a hardcoded hex: the accent is admin-configurable via
          --brand-accent, and a literal would ignore a customised palette. */}
      <input type="checkbox" {...props} className="h-4 w-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}

export function SubmitButton({
  children = "Save",
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button type="submit" {...props} className={`${btnPrimary} ${className}`}>
      {children}
    </button>
  );
}

/** The `<Link>`/`<a>` counterpart of `SubmitButton` — same shape, same tiers. */
export function AdminButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "primarySm" | "secondary";
  className?: string;
  external?: boolean;
}) {
  const cls = `${
    { primary: btnPrimary, primarySm: btnPrimarySm, secondary: btnSecondary }[variant]
  } ${className}`;
  if (external) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/* ── Page chrome ──────────────────────────────────────────────────────────*/

/**
 * The page title bar. Sticks to the top so you always know which page you are
 * on — on a 4000px settings page the title used to scroll away within one
 * flick, leaving a wall of unlabelled fields.
 *
 * `sections` renders the jump nav *inside this same bar* rather than as a
 * second sticky element. Two independent sticky nodes both parked at `top-0`
 * would simply overlap; one bar cannot collide with itself, and it keeps the
 * stuck height predictable for `SECTION_ANCHOR_OFFSET`.
 */
export function AdminHeading({
  title,
  action,
  sections,
}: {
  title: string;
  action?: { href: string; label: string };
  sections?: { id: string; label: string }[];
}) {
  return (
    <div
      // Negative margins let the bar bleed to the column's edges, so content
      // scrolling underneath is covered right up to the sides.
      className={`sticky z-30 -mx-4 mb-4 border-b border-line bg-ink/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 ${MOBILE_BAR_OFFSET}`}
    >
      {/* flex-wrap: a long title next to an action button squashed both on a
          375px screen; wrapping is better than two truncated halves. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl uppercase sm:text-3xl">{title}</h1>
        {action && (
          <AdminButtonLink href={action.href} variant="primarySm">
            {action.label}
          </AdminButtonLink>
        )}
      </div>
      {sections && <AdminSectionNav sections={sections} />}
    </div>
  );
}

/**
 * Jump links for a long single-form page (Settings, Trainer). Rendered by
 * `AdminHeading` inside its sticky bar, so it carries no positioning of its own.
 *
 * Anchors rather than tabs on purpose. Settings is one `<form>` with one Save,
 * and several of its fields are `required` — hiding a panel would make the
 * browser refuse to submit while trying to focus an invisible control, with no
 * visible error. Anchors keep every field rendered and submitted.
 */
export function AdminSectionNav({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  return (
    <nav
      aria-label="Sections"
      className="mt-2 flex gap-1 overflow-x-auto"
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`flex-none whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-ink-card hover:text-accent ${focusRing}`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * Save bar for a long form. Sticks to the bottom of the viewport while the form
 * is on screen, so a nine-card page does not have to be scrolled to its end to
 * be saved.
 *
 * Must be the form's last child: a sticky element stops at its parent's edge,
 * which is what keeps it from covering anything rendered after the form.
 */
export function AdminStickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-2 border-t border-line bg-ink/90 px-4 py-3 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}

export function AdminListControls({
  children,
  resetHref,
  /**
   * Collapse the filters behind a one-line summary on phones. Three stacked
   * fields plus two buttons fill an entire phone screen, pushing the actual
   * list below the fold — on a list you mostly just want to read, that is the
   * wrong default. Desktop is unaffected.
   */
  collapseOnMobile = false,
  /** Shown on the collapsed row so active filters are never invisible. */
  summary,
}: {
  children: ReactNode;
  resetHref: string;
  collapseOnMobile?: boolean;
  summary?: string;
}) {
  const body = (
    <>
      <div className="grid gap-3 md:grid-cols-4">{children}</div>
      <div className="mt-3 flex gap-2">
        <button type="submit" className={btnPrimarySm}>
          Apply
        </button>
        <Link href={resetHref} className={btnSecondary}>
          Reset
        </Link>
      </div>
    </>
  );

  if (!collapseOnMobile) {
    return <form className="mb-4 rounded-2xl border border-line bg-ink-card p-4">{body}</form>;
  }

  return (
    <form className="mb-4 rounded-2xl border border-line bg-ink-card p-4">
      {/* Native <details>: no JavaScript, works before hydration. On md+ the
          content is forced back to `display:block`, so the disclosure only
          exists on phones and the desktop layout is untouched. */}
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-muted md:hidden [&::-webkit-details-marker]:hidden">
          <span>
            Search &amp; filter
            {summary && <span className="ml-2 font-normal text-accent">{summary}</span>}
          </span>
          <span aria-hidden className="text-xs">
            ▾
          </span>
        </summary>
        <div className="mt-3 md:mt-0 md:block">{body}</div>
      </details>
    </form>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────────────*/

export interface AdminTab {
  key: string;
  label: string;
  href: string;
  /** Optional badge — the workload is readable without clicking through. */
  count?: number;
  /** Draws the count in the warning colour — used for "Needs you". */
  urgent?: boolean;
}

/**
 * Folder-style tabs, the one tab bar in the admin.
 *
 * Plain links over a query param rather than client state, so the page stays
 * server-rendered, bookmarkable and back-button friendly like the rest of the
 * admin.
 *
 * `surface` names the background of whatever sits directly beneath, so the
 * active tab blends into it and the two read as one panel: `soft` for a table
 * (its header is `bg-ink-soft`), `card` for an `AdminCard`.
 */
export function AdminTabs({
  tabs,
  active,
  surface = "soft",
}: {
  tabs: AdminTab[];
  active: string;
  surface?: "soft" | "card";
}) {
  const blend =
    surface === "card"
      ? "border-line border-b-ink-card bg-ink-card"
      : "border-line border-b-ink-soft bg-ink-soft";
  return (
    /*
      The rule lives on the wrapper and the 1px overlap on the scroller, not on
      each tab.

      With `-mb-px` on the tabs, the active one hung 1px past the scroll
      container — and since `overflow-x: auto` forces `overflow-y` to `auto` as
      well, that 1px raised a vertical scrollbar. The custom scrollbar in
      globals.css is 10px wide, so a 1px overhang cost 10px of width and parked
      a stray thumb at the end of every tab bar.

      Pulling the scroller itself over the wrapper's border keeps the tabs
      inside it: same overlap, nothing to scroll. The parent paints its border
      before its children, so an active tab's bottom border still covers the
      rule while transparent ones let it through.
    */
    <div className="border-b border-line">
      {/*
        The row scrolls (overflow-x-auto) whenever there are more tabs than fit
        a phone's width, but a plain overflow gives no visual sign of that — it
        just stops at the viewport edge and reads as the list ending rather
        than continuing. The mask fades the last ~28px to transparent instead
        of painting a solid-color gradient on top, so it stays correct
        regardless of what surface (card/soft) sits behind this bar. Snap
        keeps a swipe from stopping mid-label; `motion-safe:` skips it for
        anyone who has asked to reduce motion.
      */}
      <div
        className="-mb-px flex gap-0.5 overflow-x-auto px-1 motion-safe:[scroll-snap-type:x_proximity] [mask-image:linear-gradient(to_right,black_0,black_calc(100%-28px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_0,black_calc(100%-28px),transparent_100%)]"
      >
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`flex-none whitespace-nowrap rounded-t-xl border px-4 py-2.5 text-sm transition-colors motion-safe:[scroll-snap-align:start] ${
                on ? `${blend} font-semibold text-fg` : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                    tab.urgent && tab.count > 0
                      ? "bg-warn/15 text-warn"
                      : on
                        ? "bg-ink text-muted"
                        : "bg-ink/60 text-muted/80"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Data display ─────────────────────────────────────────────────────────*/

export function AdminTable({
  headers,
  children,
  /** Square off the top so a tab bar can sit flush against it. */
  flush = false,
  /** Shown in place of rows when there are none. */
  empty,
  /** Extra classes on the wrapper — e.g. hiding the table in favour of cards. */
  className = "",
}: {
  headers: string[];
  children: ReactNode;
  flush?: boolean;
  empty?: string;
  className?: string;
}) {
  // toArray flattens nested arrays and drops null/false, so an empty `rows.map`
  // reads as zero children without every caller repeating the colSpan row.
  const isEmpty = Children.toArray(children).length === 0;
  return (
    <div
      className={`overflow-x-auto border border-line ${
        flush ? "rounded-b-2xl border-t-0" : "rounded-2xl"
      } ${className}`}
    >
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
        <tbody className="divide-y divide-line bg-ink-card">
          {isEmpty && empty ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

/** A dashboard number. Wrap in a `<Link>` to make it a shortcut. */
export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-card p-4 transition-colors group-hover:border-accent/50 sm:p-5">
      <p className="font-display text-3xl text-accent">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

export function StatusPill({ value, label }: { value: string; label?: string }) {
  // Lower-cased so a display label ("Paid") still matches its tone key ("paid").
  const tone =
    {
      published: "text-ok border-ok/40",
      confirmed: "text-ok border-ok/40",
      paid: "text-ok border-ok/40",
      booked: "text-ok border-ok/40",
      new: "text-accent border-accent/40",
      popular: "text-accent border-accent/40",
      created: "text-accent border-accent/40",
      details: "text-warn border-warn/40",
      pending_payment: "text-warn border-warn/40",
      contacted: "text-warn border-warn/40",
      draft: "text-muted border-line",
      closed: "text-muted border-line",
      completed: "text-muted border-line",
      cancelled: "text-bad border-bad/40",
      failed: "text-bad border-bad/40",
    }[value.toLowerCase()] ?? "text-muted border-line";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {(label ?? value).replace(/_/g, " ")}
    </span>
  );
}
