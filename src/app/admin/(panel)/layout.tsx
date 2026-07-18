import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logoutAction } from "./actions";
import { BrandLogo } from "@/components/BrandLogo";
import { getSite, getTrainer } from "@/lib/content";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

const navSections: { label?: string; items: { label: string; href: string }[] }[] = [
  { items: [{ label: "Dashboard", href: "/admin" }] },
  {
    label: "Site content",
    items: [
      { label: "About", href: "/admin/trainer" },
      { label: "Programs", href: "/admin/programs" },
      { label: "Testimonials", href: "/admin/testimonials" },
      { label: "FAQs", href: "/admin/faqs" },
      { label: "Socials", href: "/admin/socials" },
      { label: "Blog Posts", href: "/admin/posts" },
      { label: "Newsletter", href: "/admin/newsletter" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Bookings", href: "/admin/leads" },
      { label: "WhatsApp Test", href: "/admin/whatsapp-test" },
      { label: "Data Sync", href: "/admin/sync" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Settings", href: "/admin/settings" },
      { label: "Audit Log", href: "/admin/audit" },
    ],
  },
];

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [admin, site, trainer] = await Promise.all([requireAdmin(), getSite(), getTrainer()]);
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-line bg-ink-soft p-4 md:block">
        <BrandLogo
          logoPath={site.logoPath}
          brandName={trainer.brand}
          wordmarkClassName="text-base tracking-[0.04em]"
        />
        <nav className="mt-6">
          {navSections.map((section, index) => (
            <div key={section.label ?? "dashboard"} className={index ? "mt-3 border-t border-line pt-3" : undefined}>
              {section.label && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{section.label}</p>}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-ink-card hover:text-fg"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-8 border-t border-line pt-4">
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
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-6 md:p-10">
        {/* Mobile nav */}
        <details className="mb-6 md:hidden">
          <summary className="cursor-pointer rounded-lg border border-line bg-ink-card px-4 py-2 text-sm">
            Admin menu
          </summary>
          <nav className="mt-2 rounded-lg border border-line bg-ink-card p-2">
            {navSections.map((section, index) => (
              <div key={section.label ?? "dashboard"} className={index ? "mt-2 border-t border-line pt-2" : undefined}>
                {section.label && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{section.label}</p>}
                <div className="grid grid-cols-2 gap-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded px-3 py-2 text-sm text-muted hover:bg-ink hover:text-fg"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <form action={logoutAction} className="mt-2 border-t border-line pt-2">
              <button type="submit" className="px-3 py-1 text-xs text-muted underline">
                Sign out
              </button>
            </form>
          </nav>
        </details>
        {children}
      </div>
    </div>
  );
}
