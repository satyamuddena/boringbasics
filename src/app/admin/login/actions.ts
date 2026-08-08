"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { login, requestMeta, SESSION_COOKIE_MAX_AGE_SEC } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { safeNextPath } from "@/lib/nextPath";
import { audit } from "@/lib/audit";
import { getDb, schema as t } from "@/db";
import { str } from "@/lib/forms";
import { isMobileUserAgent } from "@/lib/deviceLabel";

const MAX_ATTEMPTS_PER_15MIN = 10;

/** Failed attempts recorded in the audit log double as the rate-limit counter. */
function tooManyAttempts(ip: string | null): boolean {
  if (!ip) return false;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const row = getDb()
    .select({ c: sql<number>`COUNT(*)` })
    .from(t.auditLog)
    .where(
      and(eq(t.auditLog.action, "login_failed"), eq(t.auditLog.ip, ip), gt(t.auditLog.at, since)),
    )
    .get();
  return (row?.c ?? 0) >= MAX_ATTEMPTS_PER_15MIN;
}

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const meta = await requestMeta();

  if (tooManyAttempts(meta.ip)) {
    return { error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const token = email && password ? await login(email, password) : null;
  if (!token) {
    audit({ actor: email || "unknown", action: "login_failed", entityType: "session", ...meta });
    return { error: "Invalid email or password." };
  }

  audit({ actor: email, action: "login", entityType: "session", ...meta });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // The absolute cap, not the idle window — the DB owns idle expiry, because
    // cookies cannot be re-issued from a server component render. See auth.ts.
    maxAge: SESSION_COOKIE_MAX_AGE_SEC,
  });
  // A phone lands on Bookings — the page a trainer actually checks between
  // clients — everyone else keeps landing on the Dashboard. An explicit
  // `next` (e.g. a deep link that bounced through login) always wins over
  // this default.
  const landing = isMobileUserAgent(meta.userAgent) ? "/admin/leads" : "/admin";
  redirect(safeNextPath(formData.get("next")) ?? landing);
}
