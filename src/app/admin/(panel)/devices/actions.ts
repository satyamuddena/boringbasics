"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { str } from "@/lib/forms";

/**
 * Signs one device out remotely — the answer to "I left my phone in a taxi".
 *
 * Deletes the session and, with it, that device's push subscription, so a lost
 * phone stops showing client names on its lock screen straight away. Unlike an
 * idle expiry this is a deliberate act, which is why it takes notifications
 * with it.
 */
export async function revokeSessionAction(formData: FormData) {
  const admin = await requireAdmin();
  const tokenHash = str(formData, "tokenHash");
  if (!tokenHash) redirect("/admin/devices");

  const db = getDb();
  const session = db
    .select()
    .from(t.sessions)
    .where(eq(t.sessions.tokenHash, tokenHash))
    .get();
  // The id arrives from a form field, so ownership is re-checked here: an admin
  // may only ever revoke their own sessions.
  if (!session || session.userId !== admin.id) redirect("/admin/devices");

  db.delete(t.pushSubscriptions).where(eq(t.pushSubscriptions.sessionTokenHash, tokenHash)).run();
  db.delete(t.sessions).where(eq(t.sessions.tokenHash, tokenHash)).run();

  const meta = await requestMeta();
  audit({
    actor: admin.email,
    action: "session_revoked",
    entityType: "session",
    after: { device: session.userAgent, ip: session.ip, createdAt: session.createdAt },
    ...meta,
  });
  redirect("/admin/devices?revoked=1");
}
