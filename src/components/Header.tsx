"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
// Mobile menu closes via link click handlers (below) rather than a route effect.
import { navLinks } from "@/content/site";
import { ButtonLink } from "./Button";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";

export function Header({
  ctaLabel = "Book a Consultation",
  links = navLinks,
  logoPath,
  brandName,
  brandTagline,
}: {
  ctaLabel?: string;
  links?: { label: string; href: string }[];
  logoPath?: string;
  brandName?: string;
  brandTagline?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /**
   * The home hero is full-bleed and runs *under* this header, so while the bar
   * is still transparent it sits on a dark video rather than on the page
   * surface. In light mode the themed text colours are near-black and vanish
   * there, so this state pins them to white instead.
   *
   * Deliberately narrow. Once scrolled the header paints `bg-ink/90` — light
   * paper in light mode — and every other page puts the page background behind
   * the transparent bar, so in both of those cases the themed colours are the
   * correct ones. `Hero` is rendered only by app/(site)/page.tsx.
   */
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "border-b border-line bg-ink/90 backdrop-blur"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLogo
          logoPath={logoPath}
          brandName={brandName}
          tagline={brandTagline}
          onDark={overHero}
          wordmarkClassName="text-[15px] tracking-[0.06em] sm:text-lg sm:tracking-[0.08em]"
        />

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    overHero
                      ? active
                        ? "text-accent-vivid"
                        : "text-white/90 hover:text-white"
                      : active
                        ? "text-accent"
                        : "text-fg hover:text-accent"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle onDark={overHero} />
          <ButtonLink href="/contact" size="md">
            {ctaLabel}
          </ButtonLink>
        </div>

        {/* Mobile: theme toggle + menu button */}
        <div className="flex items-center gap-2 md:hidden">
        <ThemeToggle onDark={overHero} />
        <button
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-lg border md:hidden ${
            overHero ? "border-white/30 text-white" : "border-line text-fg"
          }`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
                open ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-current transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
                open ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-ink md:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-ink-card hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <ButtonLink href="/contact" size="lg" className="w-full" onClick={() => setOpen(false)}>
                {ctaLabel}
              </ButtonLink>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
