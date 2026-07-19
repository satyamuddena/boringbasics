"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { auditedMutation } from "@/lib/admin";
import { str } from "@/lib/forms";
import { sendNewsletter, sendNewsletterTest } from "@/lib/newsletter";
import { richTextToPlainText, sanitizeRichText } from "@/lib/richText";
import { isValidEmailAddress, parseNewsletterIntent } from "@/lib/newsletterForm";

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Ad-hoc newsletter: blank lines in the message split paragraphs. */
export async function sendNewsletterAction(formData: FormData) {
  const admin = await requireAdmin();

  const subject = str(formData, "subject");
  const html = sanitizeRichText(str(formData, "body"));
  const ctaLabel = str(formData, "ctaLabel");
  const ctaUrl = str(formData, "ctaUrl");
  const intent = parseNewsletterIntent(formData.get("intent"));
  if (!subject || !richTextToPlainText(html)) redirect("/admin/newsletter?error=missing");
  if ((ctaLabel || ctaUrl) && (!ctaLabel || !ctaUrl || !validHttpUrl(ctaUrl))) {
    redirect("/admin/newsletter?error=invalid-cta");
  }

  if (!intent) redirect("/admin/newsletter?error=invalid-action");
  const content = {
    subject,
    html,
    cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined,
  };

  if (intent === "test") {
    const testEmail = str(formData, "testEmail").toLowerCase();
    if (!isValidEmailAddress(testEmail)) redirect("/admin/newsletter?error=invalid-test-email");
    const result = await sendNewsletterTest(content, admin.email, testEmail);
    const params = new URLSearchParams({
      mode: "test",
      recipient: testEmail,
      sent: String(result.sent),
      total: String(result.total),
      failed: String(result.failed),
    });
    if (result.failure) params.set("error", result.failure);
    redirect(`/admin/newsletter?${params}`);
  }

  const result = await sendNewsletter(content, admin.email);
  const params = new URLSearchParams({
    sent: String(result.sent),
    total: String(result.total),
    failed: String(result.failed),
    mode: "broadcast",
  });
  if (result.failure) params.set("error", result.failure);
  redirect(`/admin/newsletter?${params}`);
}

export async function deleteSubscriberAction(id: number) {
  await requireAdmin();
  const db = getDb();
  await auditedMutation({
    action: "delete",
    entityType: "subscriber",
    before: () => db.select().from(t.subscribers).where(eq(t.subscribers.id, id)).get(),
    run: () => db.delete(t.subscribers).where(eq(t.subscribers.id, id)).run(),
    entityId: () => id,
  });
  redirect("/admin/newsletter");
}
