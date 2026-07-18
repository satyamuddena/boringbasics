import { NextResponse } from "next/server";
import { upsertSubscriber } from "@/lib/newsletter";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Newsletter signup (footer subscribe box). Honeypot-guarded; always returns
 * ok for well-formed emails so addresses can't be enumerated.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "subscribe", { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: { email?: string; name?: string; company?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill this.
  if (body.company && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = (body.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  try {
    upsertSubscriber({
      email,
      name: body.name,
      source: "footer",
      meta: {
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: request.headers.get("user-agent"),
      },
    });
  } catch (err) {
    console.error("[subscribe] failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
