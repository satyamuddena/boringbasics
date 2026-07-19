import { richTextToPlainText } from "./richTextCore";

const INK = "#111111";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface NewsletterContent {
  subject: string;
  paragraphs?: string[];
  html?: string;
  cta?: { label: string; url: string };
}

export interface NewsletterBranding {
  siteUrl: string;
  unsubscribeUrl: string;
  brand: string;
  tagline: string;
  logoPath?: string;
  accentColor: string;
}

export function renderNewsletterHtml(content: NewsletterContent, branding: NewsletterBranding): string {
  const { siteUrl, unsubscribeUrl, brand, tagline, logoPath, accentColor } = branding;
  const accent = /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : "#ff5722";
  let logoUrl: string | null = null;
  try { logoUrl = logoPath ? new URL(logoPath, siteUrl).toString() : null; } catch { logoUrl = null; }
  const brandWords = brand.trim().split(/\s+/);
  const lastWord = brandWords.pop() ?? brand;
  const brandLead = brandWords.join(" ");
  const wordmark = `${brandLead ? `${escapeHtml(brandLead)} ` : ""}<span style="color:${accent};">${escapeHtml(lastWord)}</span>`;
  const brandHeader = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand)}" width="320" style="display:block;width:320px;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-family:Arial,Helvetica,sans-serif;text-align:center;"><div style="font-size:21px;font-weight:800;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;">${wordmark}</div>${tagline ? `<div style="margin-top:5px;font-size:10px;font-weight:bold;letter-spacing:2.2px;color:${accent};text-transform:uppercase;">${escapeHtml(tagline)}</div>` : ""}</div>`;
  const body = content.html || (content.paragraphs ?? []).map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3d3d3d;">${escapeHtml(p)}</p>`).join("\n");
  const cta = content.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td style="border-radius:8px;background:${accent};"><a href="${escapeHtml(content.cta.url)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(content.cta.label)}</a></td></tr></table>` : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(content.subject)}</title></head><body style="margin:0;padding:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td style="background:${INK};border-radius:12px 12px 0 0;padding:20px 32px;"><a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">${brandHeader}</a></td></tr><tr><td style="background:#ffffff;padding:32px;"><h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:${INK};">${escapeHtml(content.subject)}</h1>${body}${cta}</td></tr><tr><td style="background:#ffffff;border-radius:0 0 12px 12px;border-top:1px solid #ececec;padding:20px 32px;"><p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8a;">You're receiving this because you subscribed at <a href="${escapeHtml(siteUrl)}" style="color:#8a8a8a;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>. &nbsp;·&nbsp; <a href="${escapeHtml(unsubscribeUrl)}" style="color:${accent};">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`;
}

export function renderNewsletterText(content: NewsletterContent, branding: Pick<NewsletterBranding, "brand" | "tagline" | "unsubscribeUrl">): string {
  return [`${branding.brand}${branding.tagline ? ` — ${branding.tagline}` : ""}`, "", content.subject, "", ...(content.html ? [richTextToPlainText(content.html)] : content.paragraphs ?? []), ...(content.cta ? ["", `${content.cta.label}: ${content.cta.url}`] : []), "", "—", `Unsubscribe: ${branding.unsubscribeUrl}`].join("\n");
}
