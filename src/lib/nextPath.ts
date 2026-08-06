/**
 * Validation for the `?next=` return path used after a login redirect.
 *
 * A tapped notification lands on a booking URL. If the session has gone cold
 * the trainer is sent to the login page, and without a return path they arrive
 * at the dashboard having lost the booking they were opening. This carries the
 * destination across the login — which makes it a redirect target derived from
 * the URL bar, so it is validated rather than trusted.
 *
 * Pure and dependency-free: imported by the proxy, the login action and
 * requireAdmin alike.
 */

/** Long enough for a filtered bookings URL, short enough to bound the query string. */
const MAX_LEN = 512;

/**
 * Control characters can smuggle a header break or confuse a URL parser.
 * Checked by code point rather than a regex so no literal control bytes have to
 * live in this source file.
 */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Returns the path if it is a safe same-origin admin destination, else null.
 *
 * Rejects anything that could leave the site: browsers read `//evil.com` and
 * `/\evil.com` as protocol-relative URLs, so a bare "starts with /" check is not
 * enough to prevent an open redirect. Also rejects the login page itself, which
 * would otherwise loop.
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Checked before trimming: trim() would strip a trailing CR/LF and hand back a
  // path that looks clean. A redirect target arriving with control characters is
  // a sign something is wrong with the caller, not something to quietly repair.
  if (hasControlChars(raw)) return null;
  const value = raw.trim();
  if (!value || value.length > MAX_LEN) return null;
  if (!value.startsWith("/admin/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.startsWith("/admin/login")) return null;
  return value;
}

/** `/admin/login` with a validated return path attached, or plain if there isn't one. */
export function loginUrlWithNext(next: unknown): string {
  const safe = safeNextPath(next);
  return safe ? `/admin/login?next=${encodeURIComponent(safe)}` : "/admin/login";
}
