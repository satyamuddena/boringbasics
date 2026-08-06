import "server-only";
import webpush, { type WebPushError } from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { vapidSubject, type AdminPushNotification, type PushKind } from "@/lib/pushTemplate";

/**
 * Web Push delivery to the installed admin app.
 *
 * Follows the same contract as `whatsapp.ts`: never throws, reports every
 * outcome as a result the caller can audit, and degrades to a silent no-op when
 * unconfigured — exactly as Twilio, Razorpay and SMTP already do. A failed
 * notification must never disturb the booking it is reporting on.
 */

/** What happened to one device. Aggregate counts can't answer "which one?". */
export interface PushDeviceOutcome {
  id: number;
  device: string;
  /** Apple / Google / Mozilla — inferred from the endpoint host. */
  service: string;
  outcome: "sent" | "failed" | "pruned";
  statusCode?: number;
  error?: string;
}

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
  /**
   * Per-device results, in the order attempted. Populated for every send; the
   * booking triggers ignore it, the test page is the reason it exists — "one of
   * your three phones is failing with 403" is the answer someone actually needs.
   */
  devices?: PushDeviceOutcome[];
}

/** Which push service an endpoint belongs to, for display only. */
export function pushService(endpoint: string): string {
  try {
    const host = new URL(endpoint).host;
    if (host.includes("apple")) return "Apple";
    if (host.includes("google") || host.includes("fcm")) return "Google";
    if (host.includes("mozilla")) return "Mozilla";
    if (host.includes("microsoft") || host.includes("windows")) return "Microsoft";
    return host;
  } catch {
    return "unknown";
  }
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
  // to contact whoever is sending. Not a credential — just an address. Falls
  // back to the admin login, which is by definition a real monitored mailbox.
  const subject = vapidSubject(process.env.VAPID_SUBJECT, process.env.ADMIN_EMAIL);
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
 * Everything the test page needs to explain a silent failure, without ever
 * returning the private key. Reports the subject that will actually be used
 * rather than the raw variable, since an unset one falls back to the admin
 * login and that is worth seeing.
 */
export function pushDiagnostics(): {
  publicKeySet: boolean;
  privateKeySet: boolean;
  subject: string;
  subjectSource: "VAPID_SUBJECT" | "ADMIN_EMAIL" | "built-in fallback";
  ready: boolean;
  problem?: string;
} {
  const publicKeySet = Boolean(process.env.VAPID_PUBLIC_KEY?.trim());
  const privateKeySet = Boolean(process.env.VAPID_PRIVATE_KEY?.trim());
  const configuredSubject = process.env.VAPID_SUBJECT?.trim();
  const subject = vapidSubject(configuredSubject, process.env.ADMIN_EMAIL);
  const ready = vapidReady();
  return {
    publicKeySet,
    privateKeySet,
    subject,
    subjectSource: configuredSubject
      ? "VAPID_SUBJECT"
      : subject.includes(process.env.ADMIN_EMAIL?.trim() ?? "\0")
        ? "ADMIN_EMAIL"
        : "built-in fallback",
    ready: ready.ok,
    problem: ready.ok ? undefined : ready.reason,
  };
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
  options: { userId?: number; kind?: PushKind } = {},
): Promise<PushSendResult> {
  const ready = vapidReady();
  if (!ready.ok) return { ...NOOP, skipped: ready.reason };

  const db = getDb();

  // Per-kind switches from Settings. Enforced here rather than at each trigger
  // so a new caller cannot forget to check, and deliberately skipped when no
  // kind is given — that is how the test page can prove a disabled kind still
  // works before it is switched back on.
  if (options.kind) {
    const settings = db.select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get();
    const enabled: Record<PushKind, boolean> = {
      booking: settings?.pushOnBooking ?? true,
      payment: settings?.pushOnPayment ?? false,
      reminder: settings?.pushOnReminder ?? true,
    };
    if (!enabled[options.kind]) {
      return { ...NOOP, skipped: `${options.kind} notifications are switched off in Settings.` };
    }
  }
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
  const devices: PushDeviceOutcome[] = [];
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  const attempts = subs.map(async (sub) => {
    const describe = (
      outcome: PushDeviceOutcome["outcome"],
      statusCode?: number,
      error?: string,
    ) => {
      devices.push({
        id: sub.id,
        device: sub.userAgent ?? "Unknown device",
        service: pushService(sub.endpoint),
        outcome,
        statusCode,
        error,
      });
    };
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 12 },
      );
      sent += 1;
      describe("sent");
    } catch (error) {
      const status = (error as WebPushError)?.statusCode;
      const detail = (error as Error)?.message;
      if (isGone(status)) {
        dead.push(sub.id);
        describe("pruned", status, "The push service says this device is gone.");
        return;
      }
      failed += 1;
      lastError = `Push service returned ${status ?? "no status"}.`;
      describe("failed", status, detail);
      console.error("[push] delivery failed:", status, detail);
    }
  });
  await Promise.allSettled(attempts);

  if (dead.length > 0) {
    db.delete(t.pushSubscriptions).where(inArray(t.pushSubscriptions.id, dead)).run();
  }

  return { ok: sent > 0, sent, failed, pruned: dead.length, error: lastError, devices };
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
