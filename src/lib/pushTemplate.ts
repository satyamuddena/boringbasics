/**
 * Pure message-shaping for the admin push notifications — same split as
 * whatsapp/whatsappTemplate: this file decides *what the phone says*, `push.ts`
 * is server-only and does the sending.
 *
 * The redaction rule lives here, and these builders are the only supported way
 * to make a notification. A push renders on a locked phone, before any password,
 * so the text is limited to a first name and a time: no surname, no phone, no
 * email, no amount, no payment or order id. Callers hand over the whole booking
 * and the builder takes only the two fields it is allowed to — which is why the
 * tests can pass a full booking and assert the rest never appears.
 */

import { bookingDateAndTime } from "@/lib/whatsappTemplate";

/** The kinds that can be switched off individually in Settings. */
export type PushKind = "booking" | "payment" | "reminder";

/** What the service worker receives. `url` is data only — never displayed. */
export interface AdminPushNotification {
  title: string;
  body: string;
  url: string;
  /** Collapses repeat notifications for the same booking instead of stacking. */
  tag: string;
  /**
   * Per-kind artwork. Every notification used to carry the same app icon, so a
   * glance at the lock screen could not tell a reminder from a new booking —
   * which is the whole reason a reminder is useful. `icon` is the large image;
   * `badge` is the monochrome silhouette Android puts in the status bar.
   *
   * Android only. WebKit ignores both and stamps every web-push notification
   * with the Home Screen icon, which is why the title carries an emoji as well
   * — see KIND below.
   */
  icon: string;
  badge: string;
}

/**
 * One row per kind: the artwork Android draws, and the emoji that opens the
 * title.
 *
 * The emoji is not decoration. An iPhone shows the same Home Screen icon on
 * every notification this app sends, so on the phone the admin panel is
 * actually installed on, artwork alone distinguishes nothing — the first
 * glyph of the title is the only per-kind marker that survives. Emoji match
 * their artwork so the two platforms read the same: calendar, clock, banknote.
 */
const KIND: Record<PushKind | "test", { icon: string; badge: string; emoji: string }> = {
  booking: { icon: "/icons/push-booking.png", badge: "/icons/badge-booking.png", emoji: "📅" },
  payment: { icon: "/icons/push-payment.png", badge: "/icons/badge-payment.png", emoji: "💵" },
  reminder: { icon: "/icons/push-reminder.png", badge: "/icons/badge-reminder.png", emoji: "⏰" },
  test: { icon: "/icons/icon-192.png", badge: "/icons/badge-booking.png", emoji: "🔔" },
};

/** Artwork fields only — `emoji` goes in the title, never in the payload. */
const art = ({ icon, badge }: (typeof KIND)[PushKind | "test"]) => ({ icon, badge });

/** Everything a caller might have. Only `id`, `name` and `scheduledAt` are read. */
export interface PushBookingInput {
  id: number;
  name: string;
  scheduledAt?: string | null;
  [ignored: string]: unknown;
}

/**
 * The VAPID `sub` claim: a contact URI push services can use to reach whoever
 * is sending. Not a credential, and never shown to a user.
 *
 * Forgiving on purpose. The value is a URI, but the thing anyone actually has
 * to hand is an email address — so a bare one is promoted rather than rejected,
 * and an unset subject falls back to the admin login, which is guaranteed to be
 * a real monitored mailbox. web-push throws on anything that is not mailto: or
 * https:, and that failure would otherwise appear only as "no notifications".
 *
 * Lives here rather than in push.ts so it can be tested without `server-only`.
 */
export function vapidSubject(
  configured: string | undefined,
  adminEmail: string | undefined,
  fallback = "mailto:admin@boringbasics.fit",
): string {
  const candidates = [configured?.trim(), adminEmail?.trim()];
  for (const value of candidates) {
    if (!value) continue;
    if (/^(mailto:|https:\/\/)/i.test(value)) return value;
    // A bare address — the likeliest way to fill this in by hand.
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
    // Anything else (http://, a hostname, junk) is not usable; try the next.
  }
  return fallback;
}

/** Leading word of a name, or a neutral stand-in. Never the surname. */
export function firstName(raw: string | null | undefined): string {
  const first = raw?.trim().split(/\s+/)[0]?.trim();
  return first || "Someone";
}

/**
 * Deep link into the bookings list for one booking. `/admin/leads` already
 * filters on `q` and its matcher includes the id, so no new route is needed.
 */
function bookingUrl(id: number, tab: string): string {
  return `/admin/leads?tab=${tab}&q=${encodeURIComponent(String(id))}`;
}

/** Fires when a paid booking picks a Calendly slot. */
export function bookingConfirmedNotification(booking: PushBookingInput): AdminPushNotification {
  const who = firstName(booking.name);
  const when = booking.scheduledAt ? bookingDateAndTime(booking.scheduledAt) : null;
  return {
    title: `${KIND.booking.emoji} New booking`,
    body: when ? `${who} · ${when.date}, ${when.time}` : `${who} · time to be confirmed`,
    url: bookingUrl(booking.id, "all"),
    tag: `booking-${booking.id}`,
    ...art(KIND.booking),
  };
}

/** Fires when Razorpay payment verifies, before a slot is picked. */
export function paymentReceivedNotification(booking: PushBookingInput): AdminPushNotification {
  return {
    title: `${KIND.payment.emoji} Payment received`,
    // Deliberately no amount: it is the sort of thing that reads badly over a
    // shoulder, and the trainer is opening the booking anyway.
    body: `${firstName(booking.name)} · no slot picked yet`,
    url: bookingUrl(booking.id, "notime"),
    tag: `booking-${booking.id}`,
    ...art(KIND.payment),
  };
}

/** The "Send test" button on the notifications toggle. */
export function testNotification(): AdminPushNotification {
  return {
    title: `${KIND.test.emoji} Notifications are on`,
    body: "This is what a new booking will look like.",
    url: "/admin/leads",
    tag: "test",
    ...art(KIND.test),
  };
}

/**
 * Fires shortly before a confirmed call.
 *
 * Carries its own tag rather than `booking-<id>`: the booking alert may still be
 * on the lock screen from days ago, and replacing it would swallow the reminder
 * at the exact moment it matters. `minutes` is stated in the text because "in a
 * few minutes" is not something you want to have to work out.
 */
export function callReminderNotification(
  booking: PushBookingInput,
  minutes: number,
): AdminPushNotification {
  const who = firstName(booking.name);
  const when = booking.scheduledAt ? bookingDateAndTime(booking.scheduledAt) : null;
  return {
    title: `${KIND.reminder.emoji} Call in ${minutes} minutes`,
    body: when ? `${who} · ${when.time}` : who,
    url: bookingUrl(booking.id, "upcoming"),
    tag: `reminder-${booking.id}`,
    ...art(KIND.reminder),
  };
}
