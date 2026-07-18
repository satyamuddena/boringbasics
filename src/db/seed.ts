import { sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Db } from "./index";
import * as t from "./schema";
import * as defaults from "@/content/site";
import { hashPassword } from "@/lib/password";

const now = () => new Date().toISOString();

/**
 * Idempotent seeding: each content table is filled from the bundled defaults in
 * src/content/site.ts only when it is empty, so re-running never duplicates or
 * overwrites admin edits. The admin user is created from ADMIN_EMAIL /
 * ADMIN_PASSWORD when no users exist yet.
 */
export function ensureSeeded(db: Db): void {
  const empty = (table: SQLiteTable) =>
    (db.get<{ c: number }>(sql`SELECT COUNT(*) AS c FROM ${table}`)?.c ?? 0) === 0;

  if (empty(t.trainer)) {
    db.insert(t.trainer)
      .values({
        id: 1,
        fullName: defaults.trainer.fullName,
        brand: defaults.trainer.brand,
        tagline: defaults.trainer.tagline,
        shortBio: defaults.trainer.shortBio,
        bioJson: JSON.stringify(defaults.trainer.bio),
        philosophy: defaults.trainer.philosophy,
        yearsExperience: defaults.trainer.yearsExperience,
        location: defaults.trainer.location,
        email: defaults.trainer.email,
        whatsapp: defaults.trainer.whatsapp,
        showWhatsapp: defaults.trainer.showWhatsapp,
        certificationsJson: JSON.stringify(defaults.trainer.certifications),
        certificateImage: defaults.trainer.certificateImage ?? null,
        profileImage: defaults.trainer.profileImage,
        galleryImagesJson: JSON.stringify(defaults.trainer.galleryImages),
      })
      .run();
  }

  if (empty(t.stats)) {
    db.insert(t.stats)
      .values(
        defaults.stats.map((s, i) => ({
          label: s.label,
          value: s.value,
          suffix: s.suffix ?? null,
          prefix: s.prefix ?? null,
          displayOrder: i,
        })),
      )
      .run();
  }

  if (empty(t.programs)) {
    db.insert(t.programs)
      .values(
        defaults.programs.map((p) => ({
          slug: p.slug,
          title: p.title,
          durationLabel: p.durationLabel,
          shortDescription: p.shortDescription,
          fullDescription: p.fullDescription,
          featuresJson: JSON.stringify(p.features),
          goalTagsJson: JSON.stringify(p.goalTags),
          price: p.price,
          currency: p.currency,
          billingPeriod: p.billingPeriod,
          popular: p.popular,
          displayOrder: p.displayOrder,
          image: p.image,
        })),
      )
      .run();
  }

  if (empty(t.testimonials)) {
    db.insert(t.testimonials)
      .values(
        defaults.testimonials.map((x, i) => ({
          clientName: x.clientName,
          image: x.image ?? null,
          quote: x.quote,
          rating: x.rating,
          result: x.result ?? null,
          featured: x.featured,
          placeholder: x.placeholder ?? false,
          displayOrder: i,
        })),
      )
      .run();
  }

  if (empty(t.faqs)) {
    db.insert(t.faqs)
      .values(
        defaults.faqs.map((f, i) => ({
          question: f.question,
          answer: f.answer,
          category: f.category,
          displayOrder: i,
        })),
      )
      .run();
  }

  if (empty(t.socials)) {
    db.insert(t.socials)
      .values(
        defaults.socials.map((s, i) => ({
          platform: s.platform,
          url: s.url,
          handle: s.handle,
          followers: s.followers ?? null,
          displayOrder: i,
        })),
      )
      .run();
  }

  if (empty(t.consultation)) {
    db.insert(t.consultation)
      .values({
        id: 1,
        price: defaults.consultation.price,
        currency: defaults.consultation.currency,
        durationLabel: defaults.consultation.durationLabel,
        note: defaults.consultation.note,
      })
      .run();
  }

  if (empty(t.siteSettings)) {
    db.insert(t.siteSettings)
      .values({
        id: 1,
        siteUrl: null, // falls back to env/site.ts default until set in admin
        keywordsJson: JSON.stringify(defaults.site.keywords),
      })
      .run();
  }

  if (empty(t.users)) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (email && password) {
      db.insert(t.users)
        .values({
          email: email.toLowerCase(),
          name: "Admin",
          passwordHash: hashPassword(password),
          createdAt: now(),
        })
        .run();
      console.info(`[seed] admin user created: ${email}`);
    } else {
      console.warn(
        "[seed] no admin user exists and ADMIN_EMAIL/ADMIN_PASSWORD are not set — /admin login is impossible until they are provided and the app restarts.",
      );
    }
  }
}
