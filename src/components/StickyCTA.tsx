"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ButtonLink } from "./Button";

/**
 * Sticky booking bar that slides up after the user scrolls past the hero.
 * Hidden on the contact page (where the form already lives). Label is
 * admin-controlled via /admin/settings.
 */
export function StickyCTA({ ctaLabel = "Book a Consultation" }: { ctaLabel?: string }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/contact")) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ButtonLink href="/contact" size="lg" className="shadow-glow">
        {ctaLabel}
      </ButtonLink>
    </div>
  );
}
