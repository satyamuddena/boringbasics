import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, lt } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { verifyPassword } from "./password";
import { SESSION_COOKIE, ADMIN_PATH_HEADER } from "./constants";
import { loginUrlWithNext } from "./nextPath";
import { ABSOLUTE_TTL_MS, IDLE_TTL_MS, sessionVerdict, slidSession } from "./sessionCore";

export { SESSION_COOKIE };
/**
 * The cookie is issued for the absolute cap while the *database* owns the
 * sliding idle window. That split is forced by the framework: `getAdmin()` runs
 * inside server components via `requireAdmin()`, and `cookies().set()` throws
 * during a render, so the window cannot be kept alive by re-issuing the cookie.
 * Letting the cookie outlive the row it points at is harmless — the DB lookup
 * is the real check, and it fails closed.
 */
export const SESSION_COOKIE_MAX_AGE_SEC = Math.floor(ABSOLUTE_TTL_MS / 1000);

/** Only the SHA-256 of the session token is stored — a leaked DB can't mint cookies. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
}

/**
 * Verifies credentials and creates a DB session. Returns the raw token to be
 * set as the cookie value, or null on bad credentials.
 */
export async function login(email: string, password: string): Promise<string | null> {
  const db = getDb();
  const user = db.select().from(t.users).where(eq(t.users.email, email.toLowerCase())).get();
  if (!user || !verifyPassword(password, user.passwordHash)) return null;

  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const meta = await requestMeta();
  db.insert(t.sessions)
    .values({
      tokenHash: hashToken(token),
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + IDLE_TTL_MS).toISOString(),
      lastUsedAt: now.toISOString(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    .run();
  // Opportunistic cleanup of expired sessions.
  db.delete(t.sessions).where(lt(t.sessions.expiresAt, now.toISOString())).run();
  return token;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    const db = getDb();
    // Signing out is a deliberate act — unlike an idle expiry, it should also
    // stop this device receiving client names on its lock screen.
    db.delete(t.pushSubscriptions).where(eq(t.pushSubscriptions.sessionTokenHash, tokenHash)).run();
    db.delete(t.sessions).where(eq(t.sessions.tokenHash, tokenHash)).run();
  }
  store.delete(SESSION_COOKIE);
}

/** SHA-256 of the caller's session token, or null. Identifies "this device". */
export async function currentSessionTokenHash(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** Returns the logged-in admin, or null. Never throws. */
export async function getAdmin(): Promise<AdminUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const tokenHash = hashToken(token);
    const db = getDb();
    const row = db
      .select({
        id: t.users.id,
        email: t.users.email,
        name: t.users.name,
        createdAt: t.sessions.createdAt,
        expiresAt: t.sessions.expiresAt,
        lastUsedAt: t.sessions.lastUsedAt,
      })
      .from(t.sessions)
      .innerJoin(t.users, eq(t.sessions.userId, t.users.id))
      .where(eq(t.sessions.tokenHash, tokenHash))
      .get();
    if (!row) return null;

    const verdict = sessionVerdict(row);
    if (verdict === "expired") return null;
    // Slide the idle window forward. Throttled inside sessionVerdict, so a page
    // rendering a dozen server components still costs at most one write.
    if (verdict === "refresh") {
      db.update(t.sessions).set(slidSession()).where(eq(t.sessions.tokenHash, tokenHash)).run();
    }
    return { id: row.id, email: row.email, name: row.name };
  } catch {
    return null;
  }
}

/**
 * Gate for every admin page, server action and admin API route. The proxy
 * redirect is a UX convenience only — per Next 16 docs, Server Functions can
 * bypass the matcher, so this in-request check is the real boundary.
 *
 * On failure the requested admin URL is carried to the login page as `?next=`,
 * so a notification tapped after the session went cold still lands on the right
 * booking once the password is entered.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) {
    const requested = (await headers()).get(ADMIN_PATH_HEADER);
    redirect(loginUrlWithNext(requested));
  }
  return admin;
}
