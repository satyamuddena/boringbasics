"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { str, num, bool, csv, optNum, slugify } from "@/lib/forms";
import { getSite } from "@/lib/content";
import { sendNewsletter } from "@/lib/newsletter";

/** "Email subscribers about this post" — only for published posts. */
async function notifySubscribers(values: ReturnType<typeof parse>, adminEmail: string) {
  const site = await getSite();
  await sendNewsletter(
    {
      subject: values.title,
      paragraphs: [values.excerpt].filter(Boolean),
      cta: { label: "Read the full post", url: `${site.url}/blog/${values.slug}` },
    },
    adminEmail,
  );
}

function parse(formData: FormData) {
  const title = str(formData, "title");
  const now = new Date().toISOString();
  return {
    slug: str(formData, "slug") || slugify(title),
    title,
    excerpt: str(formData, "excerpt"),
    coverImage: str(formData, "coverImage") || null,
    category: str(formData, "category") || null,
    tagsJson: csv(formData, "tags"),
    readTimeMin: optNum(formData, "readTimeMin"),
    publishedAt: str(formData, "publishedAt") || now,
    isPublished: bool(formData, "isPublished"),
    bodyMd: String(formData.get("body") ?? ""),
    updatedAt: now,
  };
}

export async function savePostAction(formData: FormData) {
  const db = getDb();
  const id = num(formData, "id", 0);
  const values = parse(formData);
  const notify = bool(formData, "notify") && values.isPublished;
  let adminEmail = "";
  if (id) {
    await auditedMutation({
      action: "update",
      entityType: "post",
      before: () => db.select().from(t.posts).where(eq(t.posts.id, id)).get(),
      run: (admin) => {
        adminEmail = admin.email;
        return db.update(t.posts).set(values).where(eq(t.posts.id, id)).run();
      },
      entityId: () => id,
      after: () => db.select().from(t.posts).where(eq(t.posts.id, id)).get(),
    });
    if (notify) await notifySubscribers(values, adminEmail);
    redirect(`/admin/posts/${id}?saved=1`);
  } else {
    const result = await auditedMutation({
      action: "create",
      entityType: "post",
      run: (admin) => {
        adminEmail = admin.email;
        return db
          .insert(t.posts)
          .values({ ...values, createdAt: values.updatedAt })
          .run();
      },
      entityId: (r) => Number(r.lastInsertRowid),
      after: (r) => db.select().from(t.posts).where(eq(t.posts.id, Number(r.lastInsertRowid))).get(),
    });
    if (notify) await notifySubscribers(values, adminEmail);
    redirect(`/admin/posts/${Number(result.lastInsertRowid)}?saved=1`);
  }
}

export async function deletePostAction(id: number) {
  const db = getDb();
  if (!id) return;
  await auditedMutation({
    action: "delete",
    entityType: "post",
    before: () => db.select().from(t.posts).where(eq(t.posts.id, id)).get(),
    run: () => db.delete(t.posts).where(eq(t.posts.id, id)).run(),
    entityId: () => id,
  });
  redirect("/admin/posts");
}
