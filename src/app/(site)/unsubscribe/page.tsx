import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { ButtonLink } from "@/components/Button";
import { getTrainer } from "@/lib/content";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

async function resubscribeAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const db = getDb();
  const row = db.select().from(t.subscribers).where(eq(t.subscribers.token, token)).get();
  if (row && row.status === "unsubscribed") {
    db.update(t.subscribers)
      .set({ status: "subscribed", unsubscribedAt: null })
      .where(eq(t.subscribers.id, row.id))
      .run();
    audit({
      actor: "public",
      action: "subscribe",
      entityType: "subscriber",
      entityId: row.id,
      after: { email: row.email, resubscribed: true },
    });
  }
  redirect(`/unsubscribe?token=${encodeURIComponent(token)}&resubscribed=1`);
}

export const dynamic = "force-dynamic";
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; resubscribed?: string }>;
}) {
  const { token, resubscribed } = await searchParams;
  const trainer = await getTrainer();
  const db = getDb();
  const row = token
    ? db.select().from(t.subscribers).where(eq(t.subscribers.token, token)).get()
    : undefined;

  // One-click unsubscribe: the emailed link lands here and takes effect
  // immediately; re-visits are idempotent. Skipped right after a resubscribe.
  if (row && row.status === "subscribed" && !resubscribed) {
    db.update(t.subscribers)
      .set({ status: "unsubscribed", unsubscribedAt: new Date().toISOString() })
      .where(eq(t.subscribers.id, row.id))
      .run();
    audit({
      actor: "public",
      action: "unsubscribe",
      entityType: "subscriber",
      entityId: row.id,
      after: { email: row.email },
    });
  }

  return (
    <section className="relative overflow-hidden pt-28">
      <div className="accent-radial pointer-events-none absolute inset-0" aria-hidden />
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        {row && resubscribed ? (
          <>
            <h1 className="font-display text-4xl uppercase sm:text-5xl">
              Welcome <span className="text-accent">back!</span>
            </h1>
            <p className="mt-5 text-muted">
              <span className="font-semibold text-fg">{row.email}</span>
              {` is back on the ${trainer.brand} newsletter list.`}
            </p>
            <div className="mt-8">
              <ButtonLink href="/" variant="secondary">
                Back to the site
              </ButtonLink>
            </div>
          </>
        ) : row ? (
          <>
            <h1 className="font-display text-4xl uppercase sm:text-5xl">
              You&apos;re <span className="text-accent">unsubscribed</span>
            </h1>
            <p className="mt-5 text-muted">
              <span className="font-semibold text-fg">{row.email}</span>
              {` won't receive the ${trainer.brand} newsletter anymore. Sorry to see you go — you can rejoin anytime.`}
            </p>
            <form action={resubscribeAction} className="mt-8">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
              >
                Changed my mind — resubscribe
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl uppercase sm:text-5xl">
              Link <span className="text-accent">not found</span>
            </h1>
            <p className="mt-5 text-muted">
              This unsubscribe link is invalid or was already removed. If you keep receiving
              emails you don&apos;t want, just reply to one of them and we&apos;ll take care of it.
            </p>
            <div className="mt-8">
              <ButtonLink href="/" variant="secondary">
                Back to the site
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
