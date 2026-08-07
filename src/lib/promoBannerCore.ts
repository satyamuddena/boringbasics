/**
 * Pure logic for the promotion banner — no database, no `server-only`, so the
 * scheduling rules can be unit-tested the way sessionCore and reminderCore are.
 */

export type PromoKind = "post" | "program" | "testimonial";

export const PROMO_KINDS: PromoKind[] = ["post", "program", "testimonial"];

export function isPromoKind(value: string): value is PromoKind {
  return (PROMO_KINDS as string[]).includes(value);
}

/**
 * India has never observed DST, so a fixed offset is exact — and unlike a
 * `toLocaleString` round-trip it cannot drift with the server's own zone.
 * The admin types wall-clock IST; the database stores UTC like every other
 * timestamp in the app (see lib/datetime.ts).
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** `<input type="datetime-local">` value (IST wall-clock) → UTC ISO string. */
export function istInputToIso(local: string | null | undefined): string | null {
  const raw = (local ?? "").trim();
  if (!raw) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(raw);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:${m[3]}:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() - IST_OFFSET_MS).toISOString();
}

/** UTC ISO string → `<input type="datetime-local">` value (IST wall-clock). */
export function isoToIstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

export interface PromoWindow {
  isEnabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export type PromoStatus = "active" | "scheduled" | "expired" | "off";

/**
 * The one place the schedule is interpreted. `isEnabled` is the manual override
 * and always wins: an unticked promo stays hidden whatever the dates say.
 * A missing bound means "open ended" on that side.
 */
export function promoStatus(row: PromoWindow, now: Date = new Date()): PromoStatus {
  if (!row.isEnabled) return "off";
  const t = now.getTime();
  const starts = row.startsAt ? Date.parse(row.startsAt) : null;
  const ends = row.endsAt ? Date.parse(row.endsAt) : null;
  // An unparseable bound is ignored rather than hiding the promo outright —
  // failing open matches the rest of the content layer's `safe()` behaviour.
  if (starts !== null && !Number.isNaN(starts) && t < starts) return "scheduled";
  if (ends !== null && !Number.isNaN(ends) && t > ends) return "expired";
  return "active";
}

export function isPromoActive(row: PromoWindow, now: Date = new Date()): boolean {
  return promoStatus(row, now) === "active";
}

/** Where a promo points when the admin left the CTA link blank. */
export function defaultPromoHref(kind: PromoKind, slug: string | null): string {
  if (kind === "post") return slug ? `/blog/${slug}` : "/blog";
  if (kind === "program") return slug ? `/programs/${slug}` : "/programs";
  return "/testimonials"; // testimonials have no individual permalink
}
