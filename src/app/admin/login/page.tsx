import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin, requestMeta } from "@/lib/auth";
import { safeNextPath } from "@/lib/nextPath";
import { isMobileUserAgent } from "@/lib/deviceLabel";
import { LoginForm } from "./LoginForm";
import { BrandLogo } from "@/components/BrandLogo";
import { getSite, getTrainer } from "@/lib/content";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Validated here as well as in the action: this value reaches a hidden field,
  // and an unchecked one would be an open redirect waiting for a crafted link.
  const next = safeNextPath((await searchParams).next);
  if (await getAdmin()) {
    // Same phone-lands-on-Bookings default as the login action, for anyone
    // who reaches this page while already signed in (e.g. the back button).
    const { userAgent } = await requestMeta();
    redirect(next ?? (isMobileUserAgent(userAgent) ? "/admin/leads" : "/admin"));
  }
  const [site, trainer] = await Promise.all([getSite(), getTrainer()]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ink-card p-8">
        <BrandLogo logoPath={site.logoPath} brandName={trainer.brand} openInNewTab />
        {/* Same scale as AdminHeading's h1 — this is the page heading, it just
            happens to sit inside the login card. */}
        <h1 className="mt-4 font-display text-2xl uppercase sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage the site.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
