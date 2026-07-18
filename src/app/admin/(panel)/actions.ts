"use server";

import { redirect } from "next/navigation";
import { getAdmin, logout, requestMeta } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function logoutAction() {
  const admin = await getAdmin();
  await logout();
  if (admin) {
    const meta = await requestMeta();
    audit({ actor: admin.email, action: "logout", entityType: "session", ...meta });
  }
  redirect("/admin/login");
}
