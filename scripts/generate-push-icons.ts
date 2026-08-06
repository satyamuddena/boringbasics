/**
 * Per-notification artwork.
 *
 * Every push used to carry the app icon, so a lock screen could not tell a
 * reminder from a new booking at a glance — which is most of the value of a
 * reminder. Each kind gets a glyph on the brand background, plus a white-on-
 * transparent badge, because Android draws the badge as a silhouette and any
 * colour in it is discarded.
 *
 *   npx tsx scripts/generate-push-icons.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "icons");
const BG = "#0a0a0b";
const ACCENT = "#ff5a0a";

/** Stroke-drawn glyphs on a 24x24 grid, so one scale rule fits all three. */
const GLYPHS: Record<string, string> = {
  // Calendar with a plus: something new arrived.
  booking: `
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <path d="M12 12.5v5M9.5 15h5" />`,
  // Clock: the call is about to start.
  reminder: `
    <circle cx="12" cy="12.5" r="8.5" />
    <path d="M12 7.5v5.5l3.5 2.5" />`,
  // Banknote with a rupee: money landed.
  payment: `
    <rect x="2.5" y="6" width="19" height="12.5" rx="2.5" />
    <path d="M9 9.5h6M9 12h6M13.5 9.5c1.6 0 2.4 1 2.4 2.2 0 1.4-1.1 2.3-2.9 2.3H9l4.2 3.5" />`,
};

const canvas = (glyph: string, stroke: string, background: string | null, size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  ${background ? `<rect width="24" height="24" rx="5" fill="${background}"/>` : ""}
  <g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
     transform="translate(12 12) scale(0.78) translate(-12 -12)">
    ${glyph}
  </g>
</svg>`;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [kind, glyph] of Object.entries(GLYPHS)) {
    // Large icon: accent glyph on the brand square, matching the app icon.
    await sharp(Buffer.from(canvas(glyph, ACCENT, BG, 192)), { density: 384 })
      .png()
      .toFile(path.join(OUT_DIR, `push-${kind}.png`));
    // Badge: white on transparent. Android keeps only the alpha channel.
    await sharp(Buffer.from(canvas(glyph, "#ffffff", null, 96)), { density: 384 })
      .png()
      .toFile(path.join(OUT_DIR, `badge-${kind}.png`));
    console.log(`  push-${kind}.png + badge-${kind}.png`);
  }
  console.log(`\nWrote ${Object.keys(GLYPHS).length * 2} files to public/icons/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
