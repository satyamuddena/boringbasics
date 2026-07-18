import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Verifies a Razorpay checkout signature (HMAC over orderId|paymentId) and
 * advances the booking to `paid`. Never trusts the client — a bad signature
 * is rejected and the stage is left unchanged.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "payment_verify", { limit: 30, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many payment verification attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: {
    bookingId?: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const bookingId = Number(body.bookingId);
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  if (!Number.isInteger(bookingId) || !orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  const db = getDb();
  const booking = db.select().from(t.leads).where(eq(t.leads.id, bookingId)).get();
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  // The order must be the one we created for this booking.
  if (booking.razorpayOrderId !== orderId) {
    return NextResponse.json({ error: "Order mismatch." }, { status: 400 });
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    audit({
      actor: "public",
      action: "payment_failed",
      entityType: "lead",
      entityId: bookingId,
      after: { reason: "bad_signature", orderId, paymentId },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  db.update(t.leads)
    .set({ stage: "paid", razorpayPaymentId: paymentId, paidAt: new Date().toISOString() })
    .where(eq(t.leads.id, bookingId))
    .run();
  audit({
    actor: "public",
    action: "payment_paid",
    entityType: "lead",
    entityId: bookingId,
    after: { orderId, paymentId },
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({ ok: true });
}
