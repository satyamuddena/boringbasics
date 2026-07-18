/**
 * One source of truth for image sizing: the admin shows the recommendation,
 * and /api/admin/upload resizes anything larger down to these bounds
 * (aspect preserved — display components crop with object-cover).
 */
export interface ImageSpec {
  /** Processing bounds — uploads are downscaled to fit inside. */
  maxW: number;
  maxH: number;
  /** Human hint shown in admin upload fields. */
  label: string;
}

export const IMAGE_SPECS = {
  profile: { maxW: 1080, maxH: 1440, label: "Best: 1080×1440 (3:4 portrait)" },
  gallery: { maxW: 900, maxH: 1200, label: "Best: 900×1200 (3:4 portrait)" },
  program: { maxW: 1600, maxH: 1200, label: "Best: 1600×1200 (4:3)" },
  testimonial: {
    maxW: 900,
    maxH: 1200,
    label: "Best: 900×1200 (3:4 portrait) — client photo or before/after collage",
  },
  post: { maxW: 1600, maxH: 900, label: "Best: 1600×900 (16:9)" },
  brandLogo: { maxW: 1600, maxH: 600, label: "Best: transparent PNG, 1600×600 or wider" },
  brandIcon: { maxW: 512, maxH: 512, label: "Best: square PNG, 512×512" },
  brandSocial: { maxW: 1200, maxH: 630, label: "Best: 1200×630 social sharing image" },
} as const satisfies Record<string, ImageSpec>;

export type ImageKind = keyof typeof IMAGE_SPECS;

export const DEFAULT_KIND: ImageKind = "program";

export function imageSpec(kind: string | null | undefined): ImageSpec {
  return IMAGE_SPECS[(kind ?? DEFAULT_KIND) as ImageKind] ?? IMAGE_SPECS[DEFAULT_KIND];
}
