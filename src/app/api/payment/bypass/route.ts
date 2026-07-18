import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { getConsultation, getTestPaymentEnabled } from "@/lib/content";
import { paymentBypassAllowed } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Test-only: marks a booking `paid` without a real charge so the rest of the
 * flow (Calendly slot + booked) can be exercised. Gated server-side — refuses
 * unless `paymentBypassAllowed()` (never in production with keys set).
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "payment_bypass", { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  if (!paymentBypassAllowed(getTestPaymentEnabled())) {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }

  let body: { bookingId?: number };
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
  // Idempotent — already progressed past details is fine.
  if (booking.stage === "paid" || booking.stage === "booked") {
    return NextResponse.json({ ok: true });
  }

  const consultation = await getConsultation();
  db.update(t.leads)
    .set({
      stage: "paid",
      razorpayPaymentId: "TEST_BYPASS",
      amountPaise: Math.round(consultation.price * 100),
      currency: consultation.currency || "INR",
      paidAt: new Date().toISOString(),
    })
    .where(eq(t.leads.id, bookingId))
    .run();
  audit({
    actor: "public",
    action: "payment_bypass",
    entityType: "lead",
    entityId: bookingId,
    after: { note: "test bypass — no charge" },
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}
