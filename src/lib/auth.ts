import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, lt } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { verifyPassword } from "./password";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

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
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
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
    getDb().delete(t.sessions).where(eq(t.sessions.tokenHash, hashToken(token))).run();
  }
  store.delete(SESSION_COOKIE);
}

/** Returns the logged-in admin, or null. Never throws. */
export async function getAdmin(): Promise<AdminUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const db = getDb();
    const row = db
      .select({
        id: t.users.id,
        email: t.users.email,
        name: t.users.name,
        expiresAt: t.sessions.expiresAt,
      })
      .from(t.sessions)
      .innerJoin(t.users, eq(t.sessions.userId, t.users.id))
      .where(eq(t.sessions.tokenHash, hashToken(token)))
      .get();
    if (!row || row.expiresAt < new Date().toISOString()) return null;
    return { id: row.id, email: row.email, name: row.name };
  } catch {
    return null;
  }
}

/**
 * Gate for every admin page, server action and admin API route. The proxy
 * redirect is a UX convenience only — per Next 16 docs, Server Functions can
 * bypass the matcher, so this in-request check is the real boundary.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
