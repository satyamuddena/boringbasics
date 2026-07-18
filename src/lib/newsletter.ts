import "server-only";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { getSite } from "./content";
import { smtpTransport } from "./mail";
import { audit } from "./audit";

/**
 * Adds an email to the newsletter list, or re-activates it after an
 * unsubscribe. Idempotent for already-subscribed addresses.
 */
export function upsertSubscriber(opts: {
  email: string;
  name?: string | null;
  source: "consultation" | "footer";
  meta?: { ip?: string | null; userAgent?: string | null };
}): void {
  const db = getDb();
  const email = opts.email.trim().toLowerCase();
  const existing = db.select().from(t.subscribers).where(eq(t.subscribers.email, email)).get();

  if (existing) {
    if (existing.status === "subscribed") return; // already on the list
    db.update(t.subscribers)
      .set({ status: "subscribed", unsubscribedAt: null, source: opts.source })
      .where(eq(t.subscribers.id, existing.id))
      .run();
    audit({
      actor: "public",
      action: "subscribe",
      entityType: "subscriber",
      entityId: existing.id,
      after: { email, source: opts.source, resubscribed: true },
      ...opts.meta,
    });
    return;
  }

  const result = db
    .insert(t.subscribers)
    .values({
      email,
      name: opts.name?.trim() || null,
      token: crypto.randomUUID(),
      status: "subscribed",
      source: opts.source,
      createdAt: new Date().toISOString(),
    })
    .run();
  audit({
    actor: "public",
    action: "subscribe",
    entityType: "subscriber",
    entityId: Number(result.lastInsertRowid),
    after: { email, source: opts.source },
    ...opts.meta,
  });
}

const ACCENT = "#ff5722";
const INK = "#111111";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface NewsletterContent {
  subject: string;
  /** Plain-text paragraphs, rendered in order. */
  paragraphs: string[];
  /** Optional call-to-action button. */
  cta?: { label: string; url: string };
}

/**
 * Professional, email-client-safe newsletter HTML: one 600px card, inline
 * styles only, brand header and a footer that always carries the
 * per-subscriber unsubscribe link.
 */
export function renderNewsletterHtml(opts: {
  content: NewsletterContent;
  siteUrl: string;
  unsubscribeUrl: string;
}): string {
  const { content, siteUrl, unsubscribeUrl } = opts;
  const paragraphsHtml = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3d3d3d;">${escapeHtml(p)}</p>`,
    )
    .join("\n");
  const ctaHtml = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
        <tr><td style="border-radius:8px;background:${ACCENT};">
          <a href="${escapeHtml(content.cta.url)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(content.cta.label)}</a>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Brand header -->
        <tr>
          <td style="background:${INK};border-radius:12px 12px 0 0;padding:20px 32px;">
            <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;font-size:22px;font-weight:800;letter-spacing:2px;color:#ffffff;">FITI<span style="color:${ACCENT};">ZENS</span></a>
          </td>
        </tr>
        <!-- Body card -->
        <tr>
          <td style="background:#ffffff;padding:32px;">
            <h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:${INK};">${escapeHtml(content.subject)}</h1>
            ${paragraphsHtml}
            ${ctaHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#ffffff;border-radius:0 0 12px 12px;border-top:1px solid #ececec;padding:20px 32px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8a;">
              You're receiving this because you subscribed at
              <a href="${escapeHtml(siteUrl)}" style="color:#8a8a8a;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>.
              &nbsp;·&nbsp;
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:${ACCENT};">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(content: NewsletterContent, unsubscribeUrl: string): string {
  return [
    content.subject,
    "",
    ...content.paragraphs,
    ...(content.cta ? ["", `${content.cta.label}: ${content.cta.url}`] : []),
    "",
    "—",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
}

/**
 * Sends a newsletter to every subscribed address, one mail per recipient so
 * each carries its own unsubscribe link. Returns per-recipient counts and
 * writes one audit row. Without SMTP config it sends nothing (sent = 0).
 */
export async function sendNewsletter(
  content: NewsletterContent,
  actor: string,
): Promise<{ total: number; sent: number; failed: number }> {
  const site = await getSite();
  const recipients = getDb()
    .select()
    .from(t.subscribers)
    .where(eq(t.subscribers.status, "subscribed"))
    .all();

  const smtp = smtpTransport();
  let sent = 0;
  let failed = 0;

  if (!smtp) {
    console.info(
      `[newsletter] SMTP not configured — would send "${content.subject}" to ${recipients.length} subscriber(s)`,
    );
  } else {
    for (const r of recipients) {
      const unsubscribeUrl = `${site.url}/unsubscribe?token=${r.token}`;
      try {
        await smtp.transporter.sendMail({
          from: `"${site.emailSenderName}" <${smtp.user}>`,
          to: r.email,
          subject: content.subject,
          text: renderText(content, unsubscribeUrl),
          html: renderNewsletterHtml({ content, siteUrl: site.url, unsubscribeUrl }),
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`[newsletter] send to ${r.email} failed:`, err);
      }
    }
  }

  audit({
    actor,
    action: "newsletter_sent",
    entityType: "newsletter",
    after: { subject: content.subject, total: recipients.length, sent, failed },
  });
  return { total: recipients.length, sent, failed };
}
