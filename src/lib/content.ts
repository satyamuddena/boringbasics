import { cache } from "react";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import * as fallback from "@/content/site";
import {
  defaultPromoHref,
  isPromoActive,
  isPromoKind,
  promoStatus,
  type PromoKind,
  type PromoStatus,
} from "./promoBannerCore";
import type {
  Trainer,
  Stat,
  Program,
  Goal,
  Testimonial,
  Faq,
  SocialLink,
  Post,
  PostListItem,
} from "@/content/site";

/* ------------------------------------------------------------------ */
/*  SQLite-backed content getters.                                     */
/*                                                                     */
/*  Same names and return types as the old src/sanity/queries.ts, so   */
/*  pages only change their import path. `cache()` dedupes within a    */
/*  request; the bundled defaults in src/content/site.ts remain the    */
/*  fallback if the database is unavailable (keeps `next build` green  */
/*  on machines without a data directory).                             */
/* ------------------------------------------------------------------ */

const json = <T>(s: string, fb: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fb;
  }
};

/** Runs a DB read; on any failure returns the bundled fallback. */
function safe<T>(read: () => T, fb: T): T {
  try {
    return read();
  } catch (err) {
    console.error("[content] DB read failed, using bundled defaults:", err);
    return fb;
  }
}

export const getTrainer = cache(async (): Promise<Trainer> =>
  safe(() => {
    const row = getDb().select().from(t.trainer).where(eq(t.trainer.id, 1)).get();
    if (!row) return fallback.trainer;
    return {
      fullName: row.fullName,
      brand: row.brand,
      tagline: row.tagline,
      shortBio: row.shortBio,
      bio: json<string[]>(row.bioJson, fallback.trainer.bio),
      philosophy: row.philosophy,
      yearsExperience: row.yearsExperience,
      location: row.location,
      email: row.email,
      whatsapp: row.whatsapp,
      showWhatsapp: row.showWhatsapp,
      certifications: json<string[]>(row.certificationsJson, fallback.trainer.certifications),
      certificateImage: row.certificateImage ?? undefined,
      profileImage: row.profileImage || fallback.trainer.profileImage,
      galleryImages: json<string[]>(row.galleryImagesJson, fallback.trainer.galleryImages),
    };
  }, fallback.trainer),
);

export const getStats = cache(async (): Promise<Stat[]> =>
  safe(() => {
    const rows = getDb().select().from(t.stats).orderBy(asc(t.stats.displayOrder)).all();
    if (!rows.length) return fallback.stats;
    return rows.map((r) => ({
      label: r.label,
      value: r.value,
      suffix: r.suffix ?? undefined,
      prefix: r.prefix ?? undefined,
    }));
  }, fallback.stats),
);

export const getPrograms = cache(async (): Promise<Program[]> =>
  safe(() => {
    const rows = getDb().select().from(t.programs).orderBy(asc(t.programs.displayOrder)).all();
    if (!rows.length) return fallback.programs;
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      durationLabel: r.durationLabel,
      shortDescription: r.shortDescription,
      fullDescription: r.fullDescription,
      features: json<string[]>(r.featuresJson, []),
      goalTags: json<Goal[]>(r.goalTagsJson, []),
      price: r.price,
      currency: r.currency,
      billingPeriod: r.billingPeriod as Program["billingPeriod"],
      popular: r.popular,
      displayOrder: r.displayOrder,
      image: r.image || fallback.programs[0].image,
    }));
  }, fallback.programs),
);

export const getProgram = cache(async (slug: string): Promise<Program | undefined> => {
  const programs = await getPrograms();
  return programs.find((p) => p.slug === slug);
});

export const getTestimonials = cache(async (): Promise<Testimonial[]> =>
  safe(() => {
    const rows = getDb()
      .select()
      .from(t.testimonials)
      .orderBy(asc(t.testimonials.displayOrder))
      .all();
    if (!rows.length) return fallback.testimonials;
    return rows.map((r) => ({
      id: String(r.id),
      clientName: r.clientName,
      image: r.image ?? undefined,
      quote: r.quote,
      rating: r.rating,
      result: r.result ?? undefined,
      featured: r.featured,
      placeholder: r.placeholder || undefined,
    }));
  }, fallback.testimonials),
);

export const getFaqs = cache(async (): Promise<Faq[]> =>
  safe(() => {
    const rows = getDb().select().from(t.faqs).orderBy(asc(t.faqs.displayOrder)).all();
    if (!rows.length) return fallback.faqs;
    return rows.map((r) => ({ question: r.question, answer: r.answer, category: r.category }));
  }, fallback.faqs),
);

export const getSocials = cache(async (): Promise<SocialLink[]> =>
  safe(() => {
    const rows = getDb().select().from(t.socials).orderBy(asc(t.socials.displayOrder)).all();
    if (!rows.length) return fallback.socials;
    return rows.map((r) => ({
      platform: r.platform,
      url: r.url,
      handle: r.handle,
      followers: r.followers ?? undefined,
    }));
  }, fallback.socials),
);

export const getConsultation = cache(async (): Promise<typeof fallback.consultation> =>
  safe(() => {
    const row = getDb().select().from(t.consultation).where(eq(t.consultation.id, 1)).get();
    if (!row) return fallback.consultation;
    return {
      price: row.price,
      currency: row.currency,
      durationLabel: row.durationLabel,
      note: row.note,
    };
  }, fallback.consultation),
);

/** "16:00" → "4:00 PM" for the popup's availability line. */
function formatTime12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** Composes "Mon–Sat, 4:00 PM – 8:00 PM (IST)" from the structured settings. */
function composeSlots(s: {
  popupDayFrom: string;
  popupDayTo: string;
  popupTimeFrom: string;
  popupTimeTo: string;
}): string {
  const days = s.popupDayFrom === s.popupDayTo ? s.popupDayFrom : `${s.popupDayFrom}–${s.popupDayTo}`;
  return `${days}, ${formatTime12h(s.popupTimeFrom)} – ${formatTime12h(s.popupTimeTo)} (IST)`;
}

/** Accepts only absolute http(s) URLs — anything else would crash metadataBase. */
function validSiteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * Site-wide config in the same shape as the static `site` object. DB settings
 * override the bundled defaults; trainer fields feed title/description.
 */
export const getSite = cache(async (): Promise<typeof fallback.site> => {
  const trainer = await getTrainer();
  const settings = safe(() => {
    return getDb().select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get() ?? null;
  }, null);
  const keywords = settings ? json<string[]>(settings.keywordsJson, fallback.site.keywords) : fallback.site.keywords;
  return {
    ...fallback.site,
    name: trainer.brand,
    title: `${trainer.brand} — ${trainer.tagline} | ${trainer.fullName}`,
    description: trainer.shortBio,
    url: validSiteUrl(settings?.siteUrl) || fallback.site.url,
    ogImage: settings?.socialImagePath || fallback.site.ogImage,
    logoPath: settings?.logoPath || fallback.site.logoPath,
    notificationLogoPath:
      settings?.notificationLogoPath || settings?.logoPath || fallback.site.notificationLogoPath,
    iconPath: settings?.iconPath || fallback.site.iconPath,
    accentColor: settings?.accentColor || fallback.site.accentColor,
    backgroundColor: settings?.backgroundColor || fallback.site.backgroundColor,
    foregroundColor: settings?.foregroundColor || fallback.site.foregroundColor,
    emailSenderName: settings?.emailSenderName || trainer.brand,
    keywords: keywords.length ? keywords : fallback.site.keywords,
    whatsappLink: `https://wa.me/${trainer.whatsapp}`,
    ctaLabel: settings?.ctaLabel || fallback.site.ctaLabel,
    calendlyUrl: settings?.calendlyUrl || fallback.site.calendlyUrl,
    heroHeadline: settings?.heroHeadline || fallback.site.heroHeadline,
    aboutHeading: settings?.aboutHeading || fallback.site.aboutHeading,
    hiddenPages: settings ? json<string[]>(settings.hiddenPagesJson, []) : [],
    popup: settings
      ? {
          enabled: settings.popupEnabled,
          title: settings.popupTitle || fallback.site.popup.title,
          body: settings.popupBody || fallback.site.popup.body,
          slots: composeSlots(settings),
          note: settings.popupNote || fallback.site.popup.note,
          delaySeconds: settings.popupDelaySeconds ?? fallback.site.popup.delaySeconds,
        }
      : fallback.site.popup,
  };
});

/**
 * Whether the admin has enabled "test payment mode" in /admin/settings.
 * Read directly (not cached) so changes take effect immediately.
 */
export function getTestPaymentEnabled(): boolean {
  return safe(() => {
    const row = getDb().select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get();
    return row?.testPaymentEnabled ?? false;
  }, false);
}

/* ------------------------------------------------------------------ */
/*  Blog — DB-only; empty until posts exist.                           */
/* ------------------------------------------------------------------ */

export const getPosts = cache(async (): Promise<PostListItem[]> =>
  safe(() => {
    const rows = getDb()
      .select()
      .from(t.posts)
      .where(eq(t.posts.isPublished, true))
      .orderBy(desc(t.posts.publishedAt))
      .all();
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      coverImage: r.coverImage ?? undefined,
      category: r.category ?? undefined,
      tags: json<string[]>(r.tagsJson, []),
      readTimeMin: r.readTimeMin ?? undefined,
      publishedAt: r.publishedAt,
    }));
  }, []),
);

/* ------------------------------------------------------------------ */
/*  Promotion banner — the strip under the header.                     */
/* ------------------------------------------------------------------ */

export interface ActivePromo {
  id: number;
  bannerText: string;
  ctaLabel: string | null;
  href: string;
  endsAt: string | null;
}

/**
 * The (at most two) promotions currently live, newest-configured order.
 *
 * Two is a deliberate cap: the strip rotates between them, and a third would
 * cycle slowly enough that a visitor could easily never see it.
 */
export const getActivePromotions = cache(async (): Promise<ActivePromo[]> =>
  safe(() => {
    const db = getDb();
    const rows = db
      .select()
      .from(t.promoBanner)
      .where(eq(t.promoBanner.isEnabled, true))
      .orderBy(asc(t.promoBanner.displayOrder), asc(t.promoBanner.id))
      .all();

    const live = rows.filter((r) => isPromoActive(r));
    return live.slice(0, 2).map((r) => {
      let slug: string | null = null;
      // Only look up the slug when we actually need it for the fallback link.
      if (!r.ctaHref && isPromoKind(r.kind)) {
        if (r.kind === "post") {
          slug = db.select({ s: t.posts.slug }).from(t.posts).where(eq(t.posts.id, r.refId)).get()?.s ?? null;
        } else if (r.kind === "program") {
          slug =
            db.select({ s: t.programs.slug }).from(t.programs).where(eq(t.programs.id, r.refId)).get()?.s ??
            null;
        }
      }
      return {
        id: r.id,
        bannerText: r.bannerText,
        ctaLabel: r.ctaLabel,
        href: r.ctaHref || defaultPromoHref(isPromoKind(r.kind) ? r.kind : "post", slug),
        endsAt: r.endsAt,
      };
    });
  }, []),
);

/** The promo attached to one item, for its own page's CTA and expiry notice. */
export const getPromoForItem = cache(
  async (kind: PromoKind, refId: number): Promise<PromoItemMeta | null> =>
    safe(() => {
      const r = getDb()
        .select()
        .from(t.promoBanner)
        .where(and(eq(t.promoBanner.kind, kind), eq(t.promoBanner.refId, refId)))
        .get();
      if (!r) return null;
      return {
        ctaLabel: r.ctaLabel,
        ctaHref: r.ctaHref,
        endsAt: r.endsAt,
        status: promoStatus(r),
      };
    }, null),
);

export interface PromoItemMeta {
  ctaLabel: string | null;
  ctaHref: string | null;
  endsAt: string | null;
  status: PromoStatus;
}

export const getPost = cache(async (slug: string): Promise<Post | null> =>
  safe(() => {
    const r = getDb().select().from(t.posts).where(eq(t.posts.slug, slug)).get();
    if (!r || !r.isPublished) return null;
    return {
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      coverImage: r.coverImage ?? undefined,
      category: r.category ?? undefined,
      tags: json<string[]>(r.tagsJson, []),
      readTimeMin: r.readTimeMin ?? undefined,
      publishedAt: r.publishedAt,
      body: r.bodyMd,
    };
  }, null),
);
