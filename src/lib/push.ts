import "server-only";
import webpush, { type WebPushError } from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import type { AdminPushNotification } from "@/lib/pushTemplate";

/**
 * Web Push delivery to the installed admin app.
 *
 * Follows the same contract as `whatsapp.ts`: never throws, reports every
 * outcome as a result the caller can audit, and degrades to a silent no-op when
 * unconfigured — exactly as Twilio, Razorpay and SMTP already do. A failed
 * notification must never disturb the booking it is reporting on.
 */

export interface PushSendResult {
  /** True when at least one device accepted the notification. */
  ok: boolean;
  sent: number;
  failed: number;
  /** Endpoints dropped because the push service said they no longer exist. */
  pruned: number;
  /** Set when nothing was attempted, e.g. no VAPID keys or no subscribers. */
  skipped?: string;
  error?: string;
}

const NOOP: PushSendResult = { ok: false, sent: 0, failed: 0, pruned: 0 };

/** Configured once per process, lazily — the keys are read at call time. */
let configured = false;

/**
 * Applies the VAPID config, or explains why it could not be applied.
 *
 * web-push validates strictly and throws — a subject missing its `mailto:`
 * prefix, or a malformed key, raises rather than returning an error. Left
 * unguarded that would throw straight out of sendAdminPush and break the
 * never-throws contract this module promises its callers, in an `after()`
 * block where nobody is waiting to catch it. So it is caught here and turned
 * into a result, which is also what puts a readable reason in the audit log
 * instead of a stack trace in the container logs.
 */
function vapidReady(): { ok: true } | { ok: false; reason: string } {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    return { ok: false, reason: "Push is not configured (VAPID keys missing)." };
  }
  if (configured) return { ok: true };

  // Required by the VAPID spec: a mailto: or https: URI push services can use
  // to contact whoever is sending. Not a credential — just an address.
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@boringbasics.fit";
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return { ok: true };
  } catch (error) {
    const detail = (error as Error)?.message ?? "unknown error";
    console.error("[push] VAPID configuration rejected:", detail);
    return {
      ok: false,
      reason: `VAPID configuration is invalid (${detail}). VAPID_SUBJECT must start with "mailto:" or "https://".`,
    };
  }
}

/** True when push is set up at all — lets the UI explain itself rather than fail silently. */
export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

/**
 * 404/410 mean the browser threw the subscription away — uninstalled app,
 * cleared site data, permission reset. That is the documented signal to forget
 * it, and not doing so leaves the table growing with endpoints that can never
 * be delivered to.
 */
const isGone = (status: number | undefined) => status === 404 || status === 410;

/**
 * Sends one notification to every device registered by admins.
 *
 * `userId` narrows it to a single admin (used by the "Send test" button, which
 * should only buzz the phone that pressed it).
 */
export async function sendAdminPush(
  notification: AdminPushNotification,
  options: { userId?: number } = {},
): Promise<PushSendResult> {
  const ready = vapidReady();
  if (!ready.ok) return { ...NOOP, skipped: ready.reason };

  const db = getDb();
  const subs = options.userId
    ? db
        .select()
        .from(t.pushSubscriptions)
        .where(eq(t.pushSubscriptions.userId, options.userId))
        .all()
    : db.select().from(t.pushSubscriptions).all();

  if (subs.length === 0) {
    return { ...NOOP, skipped: "No devices have notifications turned on." };
  }

  const payload = JSON.stringify(notification);
  const dead: number[] = [];
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  const attempts = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 12 },
      );
      sent += 1;
    } catch (error) {
      const status = (error as WebPushError)?.statusCode;
      if (isGone(status)) {
        dead.push(sub.id);
        return;
      }
      failed += 1;
      lastError = `Push service returned ${status ?? "no status"}.`;
      console.error("[push] delivery failed:", status, (error as Error)?.message);
    }
  });
  await Promise.allSettled(attempts);

  if (dead.length > 0) {
    db.delete(t.pushSubscriptions).where(inArray(t.pushSubscriptions.id, dead)).run();
  }

  return { ok: sent > 0, sent, failed, pruned: dead.length, error: lastError };
}

/** Records a device's subscription, replacing any earlier row for the same endpoint. */
export function savePushSubscription(input: {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  sessionTokenHash: string | null;
  userAgent: string | null;
}): void {
  const now = new Date().toISOString();
  getDb()
    .insert(t.pushSubscriptions)
    .values({ ...input, createdAt: now, lastSeenAt: now, failureCount: 0 })
    .onConflictDoUpdate({
      target: t.pushSubscriptions.endpoint,
      // Re-stamps ownership and the session on every mount, which is what keeps
      // the signed-in-devices list accurate after a re-login on the same phone.
      set: {
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        sessionTokenHash: input.sessionTokenHash,
        userAgent: input.userAgent,
        lastSeenAt: now,
        failureCount: 0,
      },
    })
    .run();
}

/** Forgets one device, scoped to its owner so an endpoint alone is not enough. */
export function deletePushSubscription(userId: number, endpoint: string): void {
  getDb()
    .delete(t.pushSubscriptions)
    .where(
      and(eq(t.pushSubscriptions.userId, userId), eq(t.pushSubscriptions.endpoint, endpoint)),
    )
    .run();
}

/** True when this admin has at least one device listening. */
export function hasPushSubscription(userId: number): boolean {
  return Boolean(
    getDb()
      .select({ id: t.pushSubscriptions.id })
      .from(t.pushSubscriptions)
      .where(eq(t.pushSubscriptions.userId, userId))
      .get(),
  );
}
