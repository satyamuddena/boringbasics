/**
 * One-off: push the client-feedback content updates from src/content/site.ts
 * into the live SQLite DB (which otherwise keeps the already-seeded copy).
 * Safe to re-run — it only overwrites the specific fields that changed.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as defaults from "../src/content/site";

const db = new Database("data/boring-basics.db");
db.pragma("busy_timeout = 5000");

// Apply any pending schema migrations (e.g. certificate_image) before writing.
migrate(drizzle(db), { migrationsFolder: "drizzle" });

// Trainer bio / philosophy / certifications / short bio / certificate image
db.prepare(
  `UPDATE trainer SET short_bio = ?, bio_json = ?, philosophy = ?, certifications_json = ?, certificate_image = ? WHERE id = 1`,
).run(
  defaults.trainer.shortBio,
  JSON.stringify(defaults.trainer.bio),
  defaults.trainer.philosophy,
  JSON.stringify(defaults.trainer.certifications),
  defaults.trainer.certificateImage ?? null,
);

// Programs — short + full descriptions, card image and the shared features
const updProgram = db.prepare(
  `UPDATE programs SET short_description = ?, full_description = ?, image = ?, features_json = ? WHERE slug = ?`,
);
for (const p of defaults.programs) {
  updProgram.run(p.shortDescription, p.fullDescription, p.image, JSON.stringify(p.features), p.slug);
}

// Trainer gallery — append the new photos the client supplied (keeps admin edits)
{
  const row = db.prepare(`SELECT gallery_images_json AS g FROM trainer WHERE id = 1`).get() as
    | { g: string }
    | undefined;
  if (row) {
    const gallery: string[] = JSON.parse(row.g || "[]");
    const added = defaults.trainer.galleryImages.filter((img) => !gallery.includes(img));
    if (added.length) {
      db.prepare(`UPDATE trainer SET gallery_images_json = ? WHERE id = 1`).run(
        JSON.stringify([...gallery, ...added]),
      );
      console.info(`[apply-feedback] trainer gallery: added ${added.length} photo(s).`);
    }
  }
}

// Testimonials — drop the placeholder rows, insert the real client quotes once
db.prepare(`DELETE FROM testimonials WHERE placeholder = 1`).run();
const insTestimonial = db.prepare(
  `INSERT INTO testimonials (client_name, image, quote, rating, result, featured, placeholder, display_order)
   VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
);
const hasQuote = db.prepare(`SELECT 1 FROM testimonials WHERE quote = ?`);
defaults.testimonials.forEach((x, i) => {
  if (hasQuote.get(x.quote)) return;
  insTestimonial.run(x.clientName, x.image ?? null, x.quote, x.rating, x.result ?? null, x.featured ? 1 : 0, i);
});

// Consultation note
db.prepare(`UPDATE consultation SET note = ? WHERE id = 1`).run(
  defaults.consultation.note,
);

// FAQ answers (match on question text)
const updFaq = db.prepare(`UPDATE faqs SET answer = ? WHERE question = ?`);
for (const f of defaults.faqs) {
  updFaq.run(f.answer, f.question);
}

console.info("[apply-feedback] DB updated from src/content/site.ts defaults.");
db.close();
