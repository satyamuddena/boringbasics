import { NextResponse } from "next/server";
import { issueCaptcha } from "@/lib/captcha";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Issues a booking-form CAPTCHA.
 *
 * Rate limited well above what the form needs (a visitor asks for one on load
 * and one per refresh) but low enough that the endpoint cannot be used to mine
 * challenge/answer pairs in bulk.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = rateLimit(request, "captcha", { limit: 40, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  return NextResponse.json(issueCaptcha(), {
    // A reused challenge is a spent challenge — never let one be cached.
    headers: { "Cache-Control": "no-store" },
  });
}
