import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { getConsultation, getTestPaymentEnabled } from "@/lib/content";
import {
  razorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
  paymentBypassAllowed,
} from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Creates a Razorpay order for a consultation booking. The amount is derived
 * server-side from the consultation price — never trust the client. Returns
 * `{ configured: false }` when Razorpay keys aren't set so the UI can degrade.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "payment_order", { limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  if (!razorpayConfigured()) {
    const adminToggle = getTestPaymentEnabled();
    return NextResponse.json({ configured: false, bypassAllowed: paymentBypassAllowed(adminToggle) });
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
  if (booking.stage === "paid" || booking.stage === "booked") {
    return NextResponse.json({ error: "This booking is already paid." }, { status: 409 });
  }

  const consultation = await getConsultation();
  const amountPaise = Math.round(consultation.price * 100);
  const currency = consultation.currency || "INR";

  try {
    const order = await createRazorpayOrder({
      amountPaise,
      currency,
      receipt: `consult-${bookingId}`,
      notes: { bookingId: String(bookingId), email: booking.email ?? "" },
    });
    db.update(t.leads)
      .set({ razorpayOrderId: order.id, amountPaise, currency })
      .where(eq(t.leads.id, bookingId))
      .run();
    audit({
      actor: "public",
      action: "payment_created",
      entityType: "lead",
      entityId: bookingId,
      after: { orderId: order.id, amountPaise, currency },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({
      configured: true,
      orderId: order.id,
      amountPaise,
      currency,
      keyId: razorpayKeyId(),
    });
  } catch (err) {
    console.error("[payment/order] failed:", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }
}
