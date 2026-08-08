import { Field, Input, Select, Checkbox, fieldHintClass } from "./ui";
import { isoToIstInput, PROMO_EFFECTS } from "@/lib/promoBannerCore";
import type { PromoRow } from "@/lib/promoBanner";

/**
 * The "Promote in banner" block, shared by the Posts, Programs and Testimonials
 * forms so a promotion is set up the same way whatever is being promoted.
 *
 * Every field stays rendered when the box is unticked — the fields are plain
 * inputs the server ignores unless `promoted` is present, and hiding them would
 * mean either client state in three otherwise-server-rendered forms, or losing
 * what the admin typed before they changed their mind.
 */
export function PromoteFields({
  promo,
  /** What the CTA link falls back to, e.g. "this program's page". */
  fallbackLabel,
}: {
  promo?: PromoRow;
  fallbackLabel: string;
}) {
  const on = promo?.isEnabled ?? false;
  return (
    /*
      Collapsed by default so the block costs one line on a form that is already
      long. Open when the promo is live, decided on the server like
      AdminDisclosureCard — no client state, right on first paint.

      A closed <details> still submits its fields, and none of them are
      `required`, so collapsing can never block the form the way hiding a
      required control would.
    */
    <details open={on} className="group rounded-xl border border-line bg-ink">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-fg">
          Promote in banner
          <span className={`ml-2 text-xs font-normal ${on ? "text-accent" : "text-muted"}`}>
            {on ? "On" : "Off"}
          </span>
        </span>
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>

      <div className="space-y-4 px-4 pb-4">
        <Checkbox
          name="promoted"
          label="Promote in banner"
          defaultChecked={on}
        />
        <p className="-mt-2 pl-6 text-xs text-muted">
          Shows this as a clickable strip below the menu on every page. Up to two
          promotions run at once — a third stays off until one ends.
        </p>
        <Field
          label="Banner text"
          hint="One short line — long text is cut off on phones."
        >
          <Input
            name="bannerText"
            defaultValue={promo?.bannerText ?? ""}
            placeholder="Festive Offer — 20% off all packages, ends Aug 31"
            maxLength={120}
          />
        </Field>

        <Field
          label="Attention effect"
          hint="Visitors who ask their device to reduce motion always see plain text."
        >
          <Select name="effect" defaultValue={promo?.effect ?? "none"}>
            {PROMO_EFFECTS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CTA label" hint="Leave blank to use the site's default.">
            <Input name="ctaLabel" defaultValue={promo?.ctaLabel ?? ""} placeholder="Claim Offer" />
          </Field>
          <Field label="CTA link" hint={`Leave blank to link to ${fallbackLabel}.`}>
            <Input name="ctaHref" defaultValue={promo?.ctaHref ?? ""} placeholder="/contact" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" hint="Blank starts it immediately.">
            <Input name="startsAt" type="datetime-local" defaultValue={isoToIstInput(promo?.startsAt)} />
          </Field>
          <Field label="Ends" hint="Blank runs it until switched off.">
            <Input name="endsAt" type="datetime-local" defaultValue={isoToIstInput(promo?.endsAt)} />
          </Field>
        </div>
        <span className={fieldHintClass}>Times are IST.</span>
      </div>
    </details>
  );
}
