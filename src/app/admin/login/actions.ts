"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { login, requestMeta } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { getDb, schema as t } from "@/db";
import { str } from "@/lib/forms";

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
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/admin");
}
