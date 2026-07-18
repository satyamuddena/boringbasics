import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Small in-process fixed-window limiter. Render runs this app as a single
 * instance because SQLite needs one writer, so this is effective for the
 * current deployment. If the app is ever horizontally scaled, replace this
 * with a shared store.
 */
export function rateLimit(
  request: Request,
  scope: string,
  opts: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const key = `${scope}:${requestIp(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }

  current.count += 1;
  if (current.count <= opts.limit) return { ok: true };

  return {
    ok: false,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
