import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { str, bool } from "./forms";
import { istInputToIso, type PromoKind } from "./promoBannerCore";

export type PromoRow = typeof t.promoBanner.$inferSelect;

/** The promo row for one item, for pre-filling its admin form. */
export function getPromoFor(kind: PromoKind, refId: number): PromoRow | undefined {
  if (!refId) return undefined;
  return getDb()
    .select()
    .from(t.promoBanner)
    .where(and(eq(t.promoBanner.kind, kind), eq(t.promoBanner.refId, refId)))
    .get();
}

/**
 * Applies the "Promote in banner" block from any of the three content forms.
 *
 * Unticking sets `is_enabled = 0` rather than deleting the row, so the banner
 * text and dates survive a promo being switched off — a seasonal offer can be
 * brought back next year with one click instead of being retyped.
 */
export function upsertPromoBanner(kind: PromoKind, refId: number, formData: FormData): void {
  if (!refId) return;
  const db = getDb();
  const existing = getPromoFor(kind, refId);
  const promoted = bool(formData, "promoted");
  const now = new Date().toISOString();

  if (!promoted) {
    if (existing?.isEnabled) {
      db.update(t.promoBanner)
        .set({ isEnabled: false, updatedAt: now })
        .where(eq(t.promoBanner.id, existing.id))
        .run();
    }
    return;
  }

  const values = {
    bannerText: str(formData, "bannerText"),
    ctaLabel: str(formData, "ctaLabel") || null,
    ctaHref: str(formData, "ctaHref") || null,
    startsAt: istInputToIso(str(formData, "startsAt")),
    endsAt: istInputToIso(str(formData, "endsAt")),
    isEnabled: true,
    updatedAt: now,
  };

  if (existing) {
    db.update(t.promoBanner).set(values).where(eq(t.promoBanner.id, existing.id)).run();
  } else {
    db.insert(t.promoBanner).values({ ...values, kind, refId, createdAt: now }).run();
  }
}

/** Removes the promo row for a deleted item — nothing cascades to `ref_id`. */
export function deletePromoFor(kind: PromoKind, refId: number): void {
  if (!refId) return;
  getDb()
    .delete(t.promoBanner)
    .where(and(eq(t.promoBanner.kind, kind), eq(t.promoBanner.refId, refId)))
    .run();
}
