import { NextResponse } from "next/server";
import { isValidPhoneNumber } from "libphonenumber-js";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { captchaMessage, verifyCaptcha } from "@/lib/captcha";
import { getTrainer } from "@/lib/content";
import { sendMail } from "@/lib/mail";
import { upsertSubscriber } from "@/lib/newsletter";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Consultation booking — step 1 (contact capture).
 *
 * Validates the submission, rejects bots via a honeypot and a CAPTCHA, creates
 * the booking at stage `details` (so the trainer always has the client's
 * WhatsApp + email, even if they drop off before paying) and emails the
 * trainer. Returns the booking id so the client can proceed to payment. With
 * `subscribe: true` the sender also joins the newsletter.
 */

interface LeadPayload {
  goal?: string;
  level?: string;
  name?: string;
  whatsapp?: string;
  email?: string;
  message?: string;
  /** Newsletter opt-in from the form checkbox. */
  subscribe?: boolean;
  source?: {
    pageUrl?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    program?: string;
  };
  bot_check_xyz?: string; // honeypot
  /** Signed challenge from /api/captcha, and what the visitor typed. */
  captchaToken?: string;
  captchaAnswer?: string;
}

function cleanMeta(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "lead", { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: LeadPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill this.
  if (body.bot_check_xyz && body.bot_check_xyz.trim() !== "") {
    return NextResponse.json({ ok: true }); // silently accept + drop
  }

  /*
    The CAPTCHA is enforced here, not in the form. The browser check is only a
    convenience — this route is a public endpoint that can be posted to
    directly, so a submission without a valid, unspent token is refused before
    anything is written or emailed.

    `captchaFailed` is flagged separately so the client knows to swap in a fresh
    image: a token is single-use, and the one it holds is now dead either way.
  */
  const captcha = verifyCaptcha(body.captchaToken, body.captchaAnswer);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: captchaMessage(captcha.reason), captchaFailed: true },
      { status: 400 },
    );
  }

  const name = (body.name || "").trim();
  // The client submits a full E.164 number (+<country><number>); validate it
  // against real per-country numbering rules — never trust the client.
  const whatsapp = (body.whatsapp || "").replace(/\s+/g, "");
  const email = (body.email || "").trim();

  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidPhoneNumber(whatsapp)) {
    return NextResponse.json(
      { error: "Please enter a valid WhatsApp number with country code." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const lead = {
    name,
    whatsapp,
    email,
    goal: body.goal || "—",
    level: body.level || "—",
    message: body.message?.trim() || "—",
    source: {
      pageUrl: cleanMeta(body.source?.pageUrl),
      referrer: cleanMeta(body.source?.referrer),
      utmSource: cleanMeta(body.source?.utmSource),
      utmMedium: cleanMeta(body.source?.utmMedium),
      utmCampaign: cleanMeta(body.source?.utmCampaign),
      program: cleanMeta(body.source?.program),
    },
    receivedAt: new Date().toISOString(),
  };

  // Persist first — a booking must never be lost to an email failure.
  let bookingId: number | null = null;
  try {
    const result = getDb()
      .insert(t.leads)
      .values({
        name,
        whatsapp,
        email,
        goal: body.goal || null,
        level: body.level || null,
        message: body.message?.trim() || null,
        stage: "details",
        createdAt: lead.receivedAt,
      })
      .run();
    bookingId = Number(result.lastInsertRowid);
    audit({
      actor: "public",
      action: "lead",
      entityType: "lead",
      entityId: bookingId,
      after: lead,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: request.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("[lead] DB persist failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Newsletter opt-in — same email as the enquiry; never blocks it.
  if (body.subscribe) {
    try {
      upsertSubscriber({
        email,
        name,
        source: "consultation",
        meta: {
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: request.headers.get("user-agent"),
        },
      });
    } catch (err) {
      console.error("[lead] newsletter opt-in failed:", err);
    }
  }

  const trainer = await getTrainer();
  const to = process.env.LEAD_TO_EMAIL || trainer.email;
  // Best-effort: the booking is already saved in the DB (visible in
  // /admin/leads); without SMTP sendMail just logs.
  await sendMail({
    to,
    subject: `New consultation booking — ${lead.name}`,
    text: [
      `New booking started on the ${trainer.brand} website:`,
      ``,
      `Name: ${lead.name}`,
      `WhatsApp: ${lead.whatsapp}`,
      `Email: ${lead.email}`,
      `Goal: ${lead.goal}`,
      `Level: ${lead.level}`,
      `Message: ${lead.message}`,
      `Newsletter opt-in: ${body.subscribe ? "yes" : "no"}`,
      `Page: ${lead.source.pageUrl || "—"}`,
      `Referrer: ${lead.source.referrer || "—"}`,
      `UTM: ${
        [lead.source.utmSource, lead.source.utmMedium, lead.source.utmCampaign]
          .filter(Boolean)
          .join(" / ") || "—"
      }`,
      `Program source: ${lead.source.program || "—"}`,
      ``,
      `Booking ID: #${bookingId}`,
      `Stage: details (payment + slot booking to follow)`,
      `Received: ${lead.receivedAt}`,
    ].join("\n"),
  });

  return NextResponse.json({ ok: true, bookingId });
}
