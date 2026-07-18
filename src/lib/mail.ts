import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSite, getTrainer } from "./content";

export function smtpConfigured(): boolean {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

/** Shared SMTP transport, or null when the env vars aren't set. */
export function smtpTransport(): { transporter: Transporter; user: string } | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  return {
    transporter: nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    }),
    user: SMTP_USER,
  };
}

/**
 * Best-effort email. Sends to the recipient and optionally notifies the
 * trainer. Degrades gracefully: without SMTP config it only logs — callers
 * never fail because email is unavailable.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body — `text` remains the plain-text fallback. */
  html?: string;
  /** If set, also sends this short note to the trainer/owner. */
  notifyOwner?: string;
}): Promise<void> {
  const [trainer, site] = await Promise.all([getTrainer(), getSite()]);
  const owner = process.env.LEAD_TO_EMAIL || trainer.email;

  const smtp = smtpTransport();
  if (!smtp) {
    console.info(`[mail] SMTP not configured — would send "${opts.subject}" to ${opts.to}`);
    if (opts.notifyOwner) console.info(`[mail] owner note: ${opts.notifyOwner}`);
    return;
  }

  try {
    await smtp.transporter.sendMail({
      from: `"${site.emailSenderName}" <${smtp.user}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    if (opts.notifyOwner) {
      await smtp.transporter.sendMail({
        from: `"${site.emailSenderName} Website" <${smtp.user}>`,
        to: owner,
        subject: `[${trainer.brand}] ${opts.subject}`,
        text: opts.notifyOwner,
      });
    }
  } catch (err) {
    console.error("[mail] send failed:", err);
  }
}
