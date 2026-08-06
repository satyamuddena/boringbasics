import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { getConsultation, getTrainer } from "@/lib/content";
import {
  sendTwilioWhatsAppBooking,
  sendTwilioWhatsAppCustomer,
  type BookingWhatsAppPayload,
  type WhatsAppSendResult,
} from "@/lib/whatsapp";
import { rateLimit } from "@/lib/rate-limit";
import { verifyCalendlyEvent } from "@/lib/calendly";
import { sendAdminPush } from "@/lib/push";
import { bookingConfirmedNotification } from "@/lib/pushTemplate";

/**
 * Marks a booking `booked` once the client schedules a Calendly slot (the
 * embed fires `calendly.event_scheduled`). Only advances a paid booking, so a
 * spoofed call can't skip payment.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "booking_booked", { limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: { bookingId?: number; calendlyEventUri?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const bookingId = Number(body.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Missing booking." }, { status: 400 });
  }

  const db = getDb();
  const booking = db.select().from(t.leads).where(eq(t.leads.id, bookingId)).get();
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.stage === "booked") {
    return NextResponse.json({ ok: true }); // idempotent
  }
  if (booking.stage !== "paid") {
    return NextResponse.json({ error: "Booking is not paid." }, { status: 409 });
  }

  const uri = typeof body.calendlyEventUri === "string" ? body.calendlyEventUri.slice(0, 500) : null;
  const event = await verifyCalendlyEvent(uri);
  if (!event.ok) {
    return NextResponse.json({ error: "Calendly booking could not be verified." }, { status: 400 });
  }

  const bookedAt = new Date().toISOString();
  const scheduledAt = event.startTime ?? null;
  db.update(t.leads)
    .set({
      stage: "booked",
      bookedAt,
      calendlyEventUri: uri,
      scheduledAt,
      calendlyStatus: event.status,
      calendlyCheckedAt: bookedAt,
    })
    .where(eq(t.leads.id, bookingId))
    .run();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  audit({
    actor: "public",
    action: "booking_booked",
    entityType: "lead",
    entityId: bookingId,
    after: { calendlyEventUri: uri, scheduledAt, calendlyStatus: event.status },
    ip,
  });

  const trainer = await getTrainer();
  const consultation = await getConsultation();
  const payload: BookingWhatsAppPayload = {
    name: booking.name,
    whatsapp: booking.whatsapp,
    email: booking.email,
    bookedAt,
    scheduledAt,
    brand: trainer.brand,
    durationLabel: consultation.durationLabel,
  };

  // The booking is already confirmed; notifications run after the response so
  // two 10s Twilio timeouts can never stall the client's confirmation screen.
  // Each outcome is audited — a failure here must never un-book anything.
  after(async () => {
    const record = (audience: "trainer" | "customer", recipient: string, result: WhatsAppSendResult) =>
      audit({
        actor: "public",
        action: "whatsapp_booking_notify",
        entityType: "lead",
        entityId: bookingId,
        after: {
          audience,
          recipient,
          ok: result.ok,
          sid: result.sid,
          status: result.status,
          errorCode: result.errorCode,
          error: result.error,
        },
        ip,
      });

    await Promise.allSettled([
      sendTwilioWhatsAppBooking(trainer.whatsapp, payload).then((result) =>
        record("trainer", trainer.whatsapp, result),
      ),
      sendTwilioWhatsAppCustomer(booking.whatsapp, payload).then((result) =>
        record("customer", booking.whatsapp, result),
      ),
      // Buzzes the installed admin app. Never throws; a missing VAPID key is a
      // silent no-op, exactly like an unconfigured Twilio.
      sendAdminPush(bookingConfirmedNotification({ ...booking, scheduledAt })).then((result) =>
        audit({
          actor: "public",
          action: "push_notify",
          entityType: "lead",
          entityId: bookingId,
          after: { kind: "booking_confirmed", ...result },
          ip,
        }),
      ),
    ]);
  });

  return NextResponse.json({ ok: true });
}
