"use server";

import { redirect } from "next/navigation";
import { currentSessionTokenHash, getAdmin, logout, requireAdmin, requestMeta } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  deletePushSubscription,
  savePushSubscription,
  sendAdminPush,
  type PushSendResult,
} from "@/lib/push";
import { testNotification } from "@/lib/pushTemplate";

export async function logoutAction() {
  const admin = await getAdmin();
  await logout();
  if (admin) {
    const meta = await requestMeta();
    audit({ actor: admin.email, action: "logout", entityType: "session", ...meta });
  }
  redirect("/admin/login");
}

/** What the browser's PushSubscription serialises to, as far as we need it. */
export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const looksLikeSubscription = (input: PushSubscriptionInput) =>
  typeof input?.endpoint === "string" &&
  input.endpoint.startsWith("https://") &&
  input.endpoint.length <= 1000 &&
  typeof input.p256dh === "string" &&
  input.p256dh.length > 0 &&
  typeof input.auth === "string" &&
  input.auth.length > 0;

/**
 * Registers this browser for booking notifications. Called on every mount as
 * well as on the toggle, so re-stamping an existing endpoint is the normal
 * path — that is what keeps the signed-in-devices list correct after a
 * re-login on the same phone.
 */
export async function savePushSubscriptionAction(
  input: PushSubscriptionInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!looksLikeSubscription(input)) return { ok: false, error: "Invalid subscription." };

  const meta = await requestMeta();
  savePushSubscription({
    userId: admin.id,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    sessionTokenHash: await currentSessionTokenHash(),
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

/** Turns notifications off for this browser only. */
export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();
  if (typeof endpoint === "string" && endpoint) deletePushSubscription(admin.id, endpoint);
  return { ok: true };
}

/**
 * Proves the whole chain works before the trainer relies on it — same idea as
 * the existing /admin/whatsapp-test page. Scoped to the caller's own devices.
 */
export async function sendTestPushAction(): Promise<PushSendResult> {
  const admin = await requireAdmin();
  const result = await sendAdminPush(testNotification(), { userId: admin.id });
  audit({
    actor: admin.email,
    action: "push_notify",
    entityType: "session",
    after: { kind: "test", ...result },
    ...(await requestMeta()),
  });
  return result;
}
