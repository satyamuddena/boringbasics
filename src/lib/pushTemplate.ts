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

/** What the service worker receives. `url` is data only — never displayed. */
export interface AdminPushNotification {
  title: string;
  body: string;
  url: string;
  /** Collapses repeat notifications for the same booking instead of stacking. */
  tag: string;
}

/** Everything a caller might have. Only `id`, `name` and `scheduledAt` are read. */
export interface PushBookingInput {
  id: number;
  name: string;
  scheduledAt?: string | null;
  [ignored: string]: unknown;
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
    title: "New booking",
    body: when ? `${who} · ${when.date}, ${when.time}` : `${who} · time to be confirmed`,
    url: bookingUrl(booking.id, "all"),
    tag: `booking-${booking.id}`,
  };
}

/** Fires when Razorpay payment verifies, before a slot is picked. */
export function paymentReceivedNotification(booking: PushBookingInput): AdminPushNotification {
  return {
    title: "Payment received",
    // Deliberately no amount: it is the sort of thing that reads badly over a
    // shoulder, and the trainer is opening the booking anyway.
    body: `${firstName(booking.name)} · no slot picked yet`,
    url: bookingUrl(booking.id, "notime"),
    tag: `booking-${booking.id}`,
  };
}

/** The "Send test" button on the notifications toggle. */
export function testNotification(): AdminPushNotification {
  return {
    title: "Notifications are on",
    body: "This is what a new booking will look like.",
    url: "/admin/leads",
    tag: "test",
  };
}
