"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { auditedMutation } from "@/lib/admin";
import { str } from "@/lib/forms";
import { sendNewsletter } from "@/lib/newsletter";

/** Ad-hoc newsletter: blank lines in the message split paragraphs. */
export async function sendNewsletterAction(formData: FormData) {
  const admin = await requireAdmin();

  const subject = str(formData, "subject");
  const message = str(formData, "message");
  const ctaLabel = str(formData, "ctaLabel");
  const ctaUrl = str(formData, "ctaUrl");
  if (!subject || !message) redirect("/admin/newsletter?error=missing");

  const paragraphs = message
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  const result = await sendNewsletter(
    {
      subject,
      paragraphs,
      cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined,
    },
    admin.email,
  );
  redirect(`/admin/newsletter?sent=${result.sent}&total=${result.total}&failed=${result.failed}`);
}

export async function deleteSubscriberAction(id: number) {
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
