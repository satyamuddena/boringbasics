"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { str, num, lines } from "@/lib/forms";
import { DAYS, HIDEABLE_PAGES } from "@/lib/constants";

/** Server-side guards — the pickers constrain input, but never trust the client. */
const day = (fd: FormData, key: string, fb: string) => {
  const v = str(fd, key);
  return (DAYS as readonly string[]).includes(v) ? v : fb;
};
const time = (fd: FormData, key: string, fb: string) => {
  const v = str(fd, key);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fb;
};
const clampInt = (raw: string, min: number, max: number, fb: number) => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};

/** Only absolute http(s) URLs are stored — bad values would break site metadata. */
function normalizeSiteUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Full http(s) URL incl. path (Calendly links carry the schedule in the path). */
function normalizeUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const assetPath = (formData: FormData, key: string): string | null => {
  const value = str(formData, key);
  return value.startsWith("/uploads/") || value.startsWith("/brand/") ? value : null;
};

const color = (formData: FormData, key: string, fallback: string): string => {
  const value = str(formData, key);
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
};

export async function saveSettingsAction(formData: FormData) {
  const db = getDb();
  await auditedMutation({
    action: "update",
    entityType: "site_settings",
    before: () => ({
      settings: db.select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get(),
      consultation: db.select().from(t.consultation).where(eq(t.consultation.id, 1)).get(),
      trainer: db.select().from(t.trainer).where(eq(t.trainer.id, 1)).get(),
    }),
    run: () => {
      db.update(t.siteSettings)
        .set({
          siteUrl: normalizeSiteUrl(str(formData, "siteUrl")),
          keywordsJson: lines(formData, "keywords"),
          ctaLabel: str(formData, "ctaLabel") || "Book a Consultation",
          calendlyUrl: normalizeUrl(str(formData, "calendlyUrl")),
          heroHeadline: str(formData, "heroHeadline") || "Build Better *Health* — Inside and Out.",
          aboutHeading:
            str(formData, "aboutHeading") ||
            "Coaching that's personalized, *science-based* & sustainable.",
          popupEnabled: formData.get("popupEnabled") != null,
          popupTitle: str(formData, "popupTitle"),
          popupBody: str(formData, "popupBody"),
          popupNote: str(formData, "popupNote"),
          popupDayFrom: day(formData, "popupDayFrom", "Mon"),
          popupDayTo: day(formData, "popupDayTo", "Sat"),
          popupTimeFrom: time(formData, "popupTimeFrom", "16:00"),
          popupTimeTo: time(formData, "popupTimeTo", "20:00"),
          popupDelaySeconds: clampInt(str(formData, "popupDelaySeconds"), 0, 60, 2),
          // Checked = visible; anything unchecked is stored as hidden.
          hiddenPagesJson: JSON.stringify(
            HIDEABLE_PAGES.filter((p) => formData.get(`page_${p.key}`) == null).map((p) => p.key),
          ),
          testPaymentEnabled: formData.get("testPaymentEnabled") != null,
          pushOnBooking: formData.get("pushOnBooking") != null,
          pushOnPayment: formData.get("pushOnPayment") != null,
          pushOnReminder: formData.get("pushOnReminder") != null,
          // Constrained to the values the dropdown offers: a hand-posted 0 would
          // make every confirmed call due a reminder at once.
          pushReminderMinutes: [5, 10, 15, 30].includes(num(formData, "pushReminderMinutes", 10))
            ? num(formData, "pushReminderMinutes", 10)
            : 10,
          logoPath: assetPath(formData, "logoPath"),
          notificationLogoPath: assetPath(formData, "notificationLogoPath"),
          iconPath: assetPath(formData, "iconPath"),
          socialImagePath: assetPath(formData, "socialImagePath"),
          accentColor: color(formData, "accentColor", "#ff5a0a"),
          backgroundColor: color(formData, "backgroundColor", "#0a0a0b"),
          foregroundColor: color(formData, "foregroundColor", "#f4f4f5"),
          emailSenderName: str(formData, "emailSenderName") || str(formData, "brandName"),
        })
        .where(eq(t.siteSettings.id, 1))
        .run();
      db.update(t.trainer)
        .set({
          brand: str(formData, "brandName") || "Boring Basics",
          tagline: str(formData, "brandTagline") || "Stop Looking for Magic.",
        })
        .where(eq(t.trainer.id, 1))
        .run();
      db.update(t.consultation)
        .set({
          price: num(formData, "price"),
          currency: str(formData, "currency") || "INR",
          durationLabel: str(formData, "durationLabel"),
          note: str(formData, "note"),
        })
        .where(eq(t.consultation.id, 1))
        .run();
    },
    entityId: () => 1,
    after: () => ({
      settings: db.select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get(),
      consultation: db.select().from(t.consultation).where(eq(t.consultation.id, 1)).get(),
      trainer: db.select().from(t.trainer).where(eq(t.trainer.id, 1)).get(),
    }),
  });
  redirect("/admin/settings?saved=1");
}
