/**
 * Turns a User-Agent string into something a trainer can recognise in the
 * signed-in devices list. Pure, so it is testable without a request.
 *
 * Deliberately coarse. The list answers one question — "is that phone in my
 * pocket, or is it the one I left in the taxi?" — and "iPhone · Safari" answers
 * it. Precise version sniffing would add failure modes for no gain.
 */

interface Match {
  pattern: RegExp;
  label: string;
}

/** Order matters: the more specific token has to win. */
const PLATFORMS: Match[] = [
  { pattern: /iPhone/i, label: "iPhone" },
  { pattern: /iPad/i, label: "iPad" },
  { pattern: /Android/i, label: "Android" },
  { pattern: /Windows/i, label: "Windows" },
  // Checked after iPhone/iPad: iPadOS also claims to be a Mac.
  { pattern: /Macintosh|Mac OS X/i, label: "Mac" },
  { pattern: /CrOS/i, label: "Chromebook" },
  { pattern: /Linux/i, label: "Linux" },
];

/** Chrome and Edge both claim Safari; Edge also claims Chrome. Most specific first. */
const BROWSERS: Match[] = [
  { pattern: /Edg\//i, label: "Edge" },
  { pattern: /OPR\/|Opera/i, label: "Opera" },
  { pattern: /Firefox\/|FxiOS/i, label: "Firefox" },
  { pattern: /CriOS|Chrome\//i, label: "Chrome" },
  { pattern: /Safari\//i, label: "Safari" },
];

const firstMatch = (ua: string, table: Match[]): string | null =>
  table.find((entry) => entry.pattern.test(ua))?.label ?? null;

/** e.g. "iPhone · Safari", "Windows · Chrome", or "Unknown device". */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim();
  if (!ua) return "Unknown device";
  const platform = firstMatch(ua, PLATFORMS);
  const browser = firstMatch(ua, BROWSERS);
  if (platform && browser) return `${platform} · ${browser}`;
  return platform ?? browser ?? "Unknown device";
}
