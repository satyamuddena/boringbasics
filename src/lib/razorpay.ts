import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay REST integration — no SDK, just fetch + HMAC (node:crypto).
 * Collects the consultation fee before the client picks a Calendly slot.
 * Docs: https://razorpay.com/docs/api/orders/
 */

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Whether the payment step may be skipped for testing.
 *
 * Allowed only outside production. This prevents an accidental live-site admin
 * setting or environment variable from letting real visitors skip payment.
 */
export function paymentBypassAllowed(adminToggle?: boolean): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (adminToggle) return true;
  return !razorpayConfigured();
}

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export async function createRazorpayOrder(opts: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: opts.currency,
      receipt: opts.receipt,
      notes: opts.notes,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Razorpay order failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as { id: string; amount: number; currency: string };
}

const safeEqualHex = (aHex: string, bHex: string): boolean => {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

/** Checkout signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, opts.signature);
}
