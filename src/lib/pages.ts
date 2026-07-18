import "server-only";
import { notFound } from "next/navigation";
import { getSite } from "./content";
import type { PageKey } from "./constants";

/** 404s the request when the admin has hidden this page (Settings → Pages). */
export async function assertPageVisible(key: PageKey): Promise<void> {
  const site = await getSite();
  if (site.hiddenPages.includes(key)) notFound();
}
