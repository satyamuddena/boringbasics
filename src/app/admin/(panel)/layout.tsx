import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logoutAction } from "./actions";
import { BrandLogo, BrandMark } from "@/components/BrandLogo";
import { getSite, getTrainer } from "@/lib/content";
import { AdminSidebar, type NavSection } from "./AdminSidebar";
import { MOBILE_BAR_CLEARANCE } from "@/lib/adminChrome";
import { DIAGNOSTICS_ROUTES } from "@/components/admin/DiagnosticsTabs";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

const navSections: NavSection[] = [
  { items: [{ label: "Dashboard", href: "/admin", icon: "dashboard" }] },
  {
    label: "Site content",
    items: [
      { label: "About", href: "/admin/trainer", icon: "about" },
      { label: "Programs", href: "/admin/programs", icon: "programs" },
      { label: "Testimonials", href: "/admin/testimonials", icon: "testimonials" },
      { label: "FAQs", href: "/admin/faqs", icon: "faqs" },
      { label: "Socials", href: "/admin/socials", icon: "socials" },
      { label: "Blog Posts", href: "/admin/posts", icon: "posts" },
      { label: "Newsletter", href: "/admin/newsletter", icon: "newsletter" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Bookings", href: "/admin/leads", icon: "bookings" },
      { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
      // One entry fronting the three test pages, which share a tab bar.
      {
        label: "Diagnostics",
        href: DIAGNOSTICS_ROUTES[0],
        icon: "diagnostics",
        match: DIAGNOSTICS_ROUTES.slice(1),
      },
      { label: "Data Sync", href: "/admin/sync", icon: "sync" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Settings", href: "/admin/settings", icon: "settings" },
      { label: "Devices", href: "/admin/devices", icon: "devices" },
      { label: "Audit Log", href: "/admin/audit", icon: "audit" },
    ],
  },
];

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [admin, site, trainer] = await Promise.all([requireAdmin(), getSite(), getTrainer()]);
  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        sections={navSections}
        brand={
          // Sized to fit the 224px rail alongside the collapse button: at the
          // header's default h-10 the mark alone is ~60px wide, which left the
          // wordmark too little room and pushed it under the button.
          <BrandLogo
            logoPath={site.logoPath}
            brandName={trainer.brand}
            markClassName="h-8 w-auto shrink-0 rounded-md object-contain"
            wordmarkClassName="text-sm tracking-[0.02em]"
            openInNewTab
          />
        }
        brandMark={
          // Square-constrained: the wordmark logo is wider than the collapsed rail.
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${trainer.brand} home`}
            title={trainer.brand}
            className="block"
          >
            <BrandMark
              src={site.logoPath}
              brandName={trainer.brand}
              className="h-8 w-8 rounded-md object-contain"
            />
          </Link>
        }
        footer={
          <>
            <div className="mb-3">
              <ThemeToggle />
            </div>
            <p className="truncate text-xs text-muted">{admin.email}</p>
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted underline hover:text-accent"
              >
                Visit Site ↗
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="text-xs text-muted underline hover:text-bad">
                  Sign out
                </button>
              </form>
            </div>
          </>
        }
      />
      {/*
        The mobile bar is fixed, so the column reserves its height rather than
        sliding underneath it. Padding on the column (not a margin on the bar)
        keeps the full width available to the booking cards — 40px of indent
        would be 17% of a 375px phone.
      */}
      <div className={`min-w-0 flex-1 p-4 sm:p-6 md:p-10 ${MOBILE_BAR_CLEARANCE}`}>{children}</div>
    </div>
  );
}
