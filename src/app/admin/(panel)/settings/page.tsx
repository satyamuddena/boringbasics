import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { getConsultation, getSite, getTrainer } from "@/lib/content";
import {
  AdminAlert,
  AdminCard,
  AdminHeading,
  AdminStickyActions,
  Field,
  FieldGroup,
  Input,
  Textarea,
  Select,
  Checkbox,
  SubmitButton,
} from "@/components/admin/ui";
import { DAYS, HIDEABLE_PAGES } from "@/lib/constants";
import { saveSettingsAction } from "./actions";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

export const dynamic = "force-dynamic";

/**
 * Jump targets for the sticky nav. Anchors rather than tabs: this is one form
 * with one Save and several `required` fields, and hiding a panel would make
 * the browser refuse to submit while trying to focus an invisible control.
 */
const SECTIONS = [
  { id: "branding", label: "Branding" },
  { id: "notification-branding", label: "Notifications" },
  { id: "site", label: "Site" },
  { id: "home", label: "Home page" },
  { id: "pages", label: "Pages" },
  { id: "popup", label: "Popup" },
  { id: "consultation", label: "Consultation" },
  { id: "phone-notifications", label: "Phone alerts" },
];

export default async function SettingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ saved }, site, consultation, trainer] = await Promise.all([
    searchParams,
    getSite(),
    getConsultation(),
    getTrainer(),
  ]);
  const settings = getDb().select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get();

  return (
    <>
      <AdminHeading title="Settings" sections={SECTIONS} />
      {saved && <AdminAlert tone="ok">Saved.</AdminAlert>}

      <form action={saveSettingsAction} className="max-w-3xl space-y-4 sm:space-y-6">
        <AdminCard id="branding" title="Branding">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand name" hint="Used in page titles, checkout, messages and copyright.">
                <Input name="brandName" defaultValue={trainer.brand} required />
              </Field>
              <Field label="Brand tagline">
                <Input name="brandTagline" defaultValue={trainer.tagline} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ImageUploadField name="logoPath" label="Header logo" kind="brandLogo" defaultValue={site.logoPath} />
              <ImageUploadField name="iconPath" label="Favicon / app icon" kind="brandIcon" defaultValue={site.iconPath} />
              <ImageUploadField name="socialImagePath" label="Social sharing image" kind="brandSocial" defaultValue={site.ogImage} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Accent colour" hint="Buttons, links and highlights.">
                <Input name="accentColor" type="color" defaultValue={site.accentColor} className="h-11 p-1" />
              </Field>
              <Field label="Background colour" hint="Default dark-theme background.">
                <Input name="backgroundColor" type="color" defaultValue={site.backgroundColor} className="h-11 p-1" />
              </Field>
              <Field label="Text colour" hint="Default dark-theme text.">
                <Input name="foregroundColor" type="color" defaultValue={site.foregroundColor} className="h-11 p-1" />
              </Field>
            </div>
            <Field label="Email sender name" hint="Display name shown in transactional and newsletter emails.">
              <Input name="emailSenderName" defaultValue={site.emailSenderName} required />
            </Field>
          </div>
        </AdminCard>

        <AdminCard id="notification-branding" title="Notification branding">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">
              Upload the logo or wordmark used at the top of newsletters and other email notifications.
              A transparent PNG with strong contrast on a dark background works best. If left empty,
              notifications use the website header logo.
            </p>
            <ImageUploadField
              name="notificationLogoPath"
              label="Notification header logo"
              kind="brandNotification"
              defaultValue={site.notificationLogoPath}
            />
          </div>
        </AdminCard>

        <AdminCard id="site" title="Site">
          <div className="space-y-4">
            <Field label="Site URL" hint="Canonical URL for SEO — e.g. https://boringbasics.in">
              <Input name="siteUrl" type="url" defaultValue={settings?.siteUrl ?? ""} placeholder={site.url} />
            </Field>
            <Field label="SEO keywords" hint="One per line.">
              <Textarea name="keywords" rows={5} defaultValue={site.keywords.join("\n")} />
            </Field>
            <Field
              label="Booking button label"
              hint='Used by every booking button across the site — e.g. "Book a Consultation" or "Book a Call".'
            >
              <Input name="ctaLabel" defaultValue={site.ctaLabel} />
            </Field>
            <Field
              label="Calendly link"
              hint="Public scheduling link — embedded on the contact page and opened by the home popup. Leave blank to use the default."
            >
              <Input
                name="calendlyUrl"
                type="url"
                defaultValue={settings?.calendlyUrl ?? ""}
                placeholder={site.calendlyUrl}
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard id="home" title="Home-page headlines">
          <div className="space-y-4">
            <Field
              label="Hero headline"
              hint="Wrap words in *asterisks* to highlight them in the accent colour."
            >
              <Input name="heroHeadline" defaultValue={site.heroHeadline} />
            </Field>
            <Field
              label="About-section heading"
              hint="Shown above the bio on the home page. *Asterisks* highlight words."
            >
              <Input name="aboutHeading" defaultValue={site.aboutHeading} />
            </Field>
          </div>
        </AdminCard>

        <AdminCard id="pages" title="Pages">
          <p className="mb-3 text-xs text-muted/70">
            Unchecked pages disappear from the menu and their links stop working. Home and
            Contact are always visible.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {HIDEABLE_PAGES.map((p) => (
              <Checkbox
                key={p.key}
                name={`page_${p.key}`}
                label={p.label}
                defaultChecked={!site.hiddenPages.includes(p.key)}
              />
            ))}
          </div>
        </AdminCard>

        <AdminCard id="popup" title="Home-page welcome popup">
          <div className="space-y-4">
            <Checkbox
              name="popupEnabled"
              label="Show the popup to first-time visitors on the home page"
              defaultChecked={site.popup.enabled}
            />
            <Field label="Title">
              <Input name="popupTitle" defaultValue={site.popup.title} />
            </Field>
            <Field label="Message">
              <Textarea name="popupBody" defaultValue={site.popup.body} />
            </Field>
            {/* FieldGroup, not Field: four controls cannot share one <label>. */}
            <FieldGroup label="Available slots" hint={`Shown as: ${site.popup.slots}`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Select name="popupDayFrom" defaultValue={settings?.popupDayFrom ?? "Mon"} aria-label="From day">
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Select name="popupDayTo" defaultValue={settings?.popupDayTo ?? "Sat"} aria-label="To day">
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Input name="popupTimeFrom" type="time" defaultValue={settings?.popupTimeFrom ?? "16:00"} aria-label="From time" />
                <Input name="popupTimeTo" type="time" defaultValue={settings?.popupTimeTo ?? "20:00"} aria-label="To time" />
              </div>
            </FieldGroup>
            <Field label="Note" hint='Second info line — e.g. "Strictly one-on-one…"'>
              <Input name="popupNote" defaultValue={site.popup.note} />
            </Field>
            <Field
              label="Show after (seconds)"
              hint="Counted from when the page finishes loading, so the popup never lands on a half-drawn page. 0 shows it as soon as the page is ready; 2–5 is typical."
            >
              <Input
                name="popupDelaySeconds"
                type="number"
                min={0}
                max={60}
                step={1}
                defaultValue={site.popup.delaySeconds}
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard id="consultation" title="Consultation call">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)">
              <Input name="price" type="number" defaultValue={consultation.price} />
            </Field>
            <Field label="Currency">
              <Select name="currency" defaultValue={consultation.currency}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </Select>
            </Field>
            <Field label="Duration label" hint="e.g. 30 minutes">
              <Input name="durationLabel" defaultValue={consultation.durationLabel} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Note" hint="Shown under the price on the contact page.">
              <Textarea name="note" defaultValue={consultation.note} />
            </Field>
          </div>
          <AdminAlert tone="warn" className="mt-4">
            <Checkbox
              name="testPaymentEnabled"
              label="Enable test payment mode (skip payment step)"
              defaultChecked={settings?.testPaymentEnabled ?? false}
            />
            <p className="mt-1 text-xs text-warn/80">
              Only works outside production. Live deployments never allow payment bypass,
              even if this box is checked.
            </p>
          </AdminAlert>
        </AdminCard>

        <AdminCard id="phone-notifications" title="Phone notifications">
          <p className="mb-4 text-sm text-muted">
            What the installed app buzzes about. Each kind opens with its own emoji, so a
            reminder is distinguishable from a new booking at a glance on the lock screen —
            on iPhone that emoji is the only marker, because iOS shows the app icon on every
            notification regardless of the artwork sent.
          </p>
          <div className="space-y-3">
            <div>
              <Checkbox
                name="pushOnBooking"
                label="Booking received"
                defaultChecked={settings?.pushOnBooking ?? true}
              />
              <p className="ml-6 text-xs text-muted/70">
                When someone pays and picks a time.
              </p>
            </div>
            <div>
              <Checkbox
                name="pushOnReminder"
                label="Call reminder"
                defaultChecked={settings?.pushOnReminder ?? true}
              />
              <p className="ml-6 text-xs text-muted/70">
                Shortly before a confirmed call starts.
              </p>
            </div>
            <div>
              <Checkbox
                name="pushOnPayment"
                label="Payment received"
                defaultChecked={settings?.pushOnPayment ?? false}
              />
              <p className="ml-6 text-xs text-muted/70">
                Fires the moment payment clears, before a time is picked. Off by default —
                on a normal booking it arrives alongside the booking alert.
              </p>
            </div>
          </div>
          <div className="mt-4 max-w-xs">
            <Field label="Remind me before a call">
              <Select
                name="pushReminderMinutes"
                defaultValue={String(settings?.pushReminderMinutes ?? 10)}
              >
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </Select>
            </Field>
          </div>
        </AdminCard>

        {/* Last child of the form on purpose: a sticky element stops at its
            parent's edge, so the bar never floats over the devices card below. */}
        <AdminStickyActions>
          <SubmitButton>Save settings</SubmitButton>
        </AdminStickyActions>
      </form>
    </>
  );
}
