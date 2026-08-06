/**
 * Generates the PWA icon set for the installable admin app from the brand mark.
 *
 * One-shot: run it when the mark or the brand colours change, then commit the
 * PNGs. Deliberately not part of the build — the OS caches these at install
 * time, so they change rarely and a build-time step would only add a sharp
 * dependency to the deploy for files that are already correct.
 *
 *   npx tsx scripts/generate-icons.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = path.join(process.cwd(), "public", "brand", "boring-basics-mark.svg");
const OUT_DIR = path.join(process.cwd(), "public", "icons");

/** Matches the mark's own backing rect, so the composite has no visible seam. */
const BACKGROUND = { r: 0x05, g: 0x05, b: 0x05, alpha: 1 };

interface IconSpec {
  file: string;
  size: number;
  /** Fraction of the canvas width the trimmed wordmark spans. */
  scale: number;
}

/**
 * The mark is a wide wordmark (~1.8:1 once trimmed), and a square icon can only
 * ever be about half-filled by one. On a home screen that reads as a small strip
 * floating in a big tile, so the glyphs are pushed close to the edges — at 60px
 * the difference between 78% and 92% is the difference between legible and not.
 */
const ICONS: IconSpec[] = [
  { file: "icon-192.png", size: 192, scale: 0.92 },
  { file: "icon-512.png", size: 512, scale: 0.92 },
  // Maskable icons get cropped to whatever shape the launcher likes — Android
  // guarantees only the central 80% circle, so this one stays inside it.
  { file: "icon-512-maskable.png", size: 512, scale: 0.68 },
  // iOS ignores manifest icons for the home screen, never composites
  // transparency, and rounds the corners itself. Opaque, sized for @3x.
  { file: "apple-touch-icon.png", size: 180, scale: 0.92 },
];

async function main() {
  if (!fs.existsSync(SOURCE)) throw new Error(`Brand mark not found at ${SOURCE}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  /*
   * Drop the mark's own backing rect before rasterising. It carries generous
   * padding that is right for a header but wasteful in an app tile — and with
   * it gone, `trim()` can find the true edges of the glyphs so the icon is
   * sized to the artwork rather than to the artboard.
   */
  const svg = Buffer.from(
    fs.readFileSync(SOURCE, "utf8").replace(/<rect[^>]*fill="#050505"[^>]*\/>/, ""),
  );
  const glyphs = await sharp(svg, { density: 1024 })
    .trim()
    .png()
    .toBuffer();
  const trimmed = await sharp(glyphs).metadata();
  console.log(
    `  source glyphs ${trimmed.width}x${trimmed.height} ` +
      `(aspect ${((trimmed.width ?? 1) / (trimmed.height ?? 1)).toFixed(2)}:1)\n`,
  );

  for (const { file, size, scale } of ICONS) {
    const markWidth = Math.round(size * scale);
    const mark = await sharp(glyphs).resize({ width: markWidth }).png().toBuffer();
    const { height: markHeight = 0 } = await sharp(mark).metadata();

    await sharp({
      create: { width: size, height: size, channels: 4, background: BACKGROUND },
    })
      .composite([
        {
          input: mark,
          left: Math.round((size - markWidth) / 2),
          top: Math.round((size - markHeight) / 2),
        },
      ])
      .png()
      .toFile(path.join(OUT_DIR, file));

    console.log(`  ${file}  ${size}x${size}`);
  }
  console.log(`\nWrote ${ICONS.length} icons to public/icons/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
