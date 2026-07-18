"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { auditedMutation } from "@/lib/admin";
import { str, num, optNum } from "@/lib/forms";
import { platformFor } from "@/lib/social-platforms";

function parse(formData: FormData) {
  // Platform comes from a dropdown, but never trust the client: normalize to a
  // known platform label. URLs must be absolute http(s).
  const platform = platformFor(str(formData, "platform")).label;
  let url = str(formData, "url");
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
    url = u.toString();
  } catch {
    throw new Error("Please enter a valid https:// link.");
  }
  return {
    platform,
    url,
    handle: str(formData, "handle"),
    followers: optNum(formData, "followers"),
    displayOrder: num(formData, "displayOrder"),
  };
}

export async function saveSocialAction(formData: FormData) {
  const db = getDb();
  const id = num(formData, "id", 0);
  const values = parse(formData);
  if (id) {
    await auditedMutation({
      action: "update",
      entityType: "social",
      before: () => db.select().from(t.socials).where(eq(t.socials.id, id)).get(),
      run: () => db.update(t.socials).set(values).where(eq(t.socials.id, id)).run(),
      entityId: () => id,
      after: () => db.select().from(t.socials).where(eq(t.socials.id, id)).get(),
    });
  } else {
    await auditedMutation({
      action: "create",
      entityType: "social",
      run: () => db.insert(t.socials).values(values).run(),
      entityId: (r) => Number(r.lastInsertRowid),
      after: (r) => db.select().from(t.socials).where(eq(t.socials.id, Number(r.lastInsertRowid))).get(),
    });
  }
  redirect("/admin/socials");
}

export async function deleteSocialAction(id: number) {
  const db = getDb();
  if (!id) return;
  await auditedMutation({
    action: "delete",
    entityType: "social",
    before: () => db.select().from(t.socials).where(eq(t.socials.id, id)).get(),
    run: () => db.delete(t.socials).where(eq(t.socials.id, id)).run(),
    entityId: () => id,
  });
  redirect("/admin/socials");
}
