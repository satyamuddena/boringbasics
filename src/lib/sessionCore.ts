/**
 * The pure half of session lifetime: deciding whether a stored session is still
 * good, and whether it has earned a slide forward. Kept free of `server-only`
 * so it is testable without a database; the cookie and DB work live in auth.ts.
 *
 * The shape of the rules matters more than the numbers. A flat expiry measured
 * from login is wrong for a phone app — the trainer is bounced to a login screen
 * mid-week for no reason other than the calendar. A window measured from *last
 * use* means an app opened regularly never expires, while one left untouched
 * still goes cold. The absolute cap then guarantees a password is demanded
 * eventually no matter how active the device is, so a lost phone cannot stay
 * signed in forever.
 */

/** Cold after this long without a request. Refreshed on use. */
export const IDLE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Hard ceiling from login, regardless of activity. Never slides. */
export const ABSOLUTE_TTL_MS = 1000 * 60 * 60 * 24 * 180; // 180 days

/**
 * How stale `lastUsedAt` must be before we spend a write on it. `getAdmin()`
 * runs on every admin request; without this a page with a few server components
 * would issue a burst of identical UPDATEs for no gain.
 */
export const REFRESH_AFTER_MS = 1000 * 60 * 60; // 1 hour

export interface SessionTimes {
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
}

/**
 * - `expired` — reject and send them to the login page.
 * - `refresh` — valid, and stale enough to be worth sliding the window forward.
 * - `valid`   — valid, leave the row alone.
 */
export type SessionVerdict = "valid" | "refresh" | "expired";

/** Missing/garbage timestamps read as 0, which fails closed to `expired`. */
const ms = (iso: string | null): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export function sessionVerdict(session: SessionTimes, now = Date.now()): SessionVerdict {
  // Idle timeout: the sliding window ran out.
  if (ms(session.expiresAt) <= now) return "expired";
  // Absolute cap: active or not, this login is old enough to redo.
  if (now - ms(session.createdAt) >= ABSOLUTE_TTL_MS) return "expired";
  // Sessions predating the sliding window have no lastUsedAt — treating null as
  // "long ago" migrates them onto it on their next request rather than at login.
  return now - ms(session.lastUsedAt) >= REFRESH_AFTER_MS ? "refresh" : "valid";
}

/** The new `lastUsedAt` / `expiresAt` pair to store when the verdict is `refresh`. */
export function slidSession(now = Date.now()): { lastUsedAt: string; expiresAt: string } {
  return {
    lastUsedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + IDLE_TTL_MS).toISOString(),
  };
}
