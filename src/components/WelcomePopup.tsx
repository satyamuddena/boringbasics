"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ButtonLink } from "./Button";

interface WelcomePopupProps {
  title: string;
  body: string;
  slots: string;
  note: string;
  ctaLabel: string;
}

/**
 * Home-page popup. Content is admin-controlled (/admin/settings). Shows every
 * time the home page is loaded or navigated to (per client requirement);
 * dismissing only closes it for the current view. Respects Escape, backdrop
 * click and focus accessibility.
 */
export function WelcomePopup(props: WelcomePopupProps) {
  const pathname = usePathname();
  // Mounted only on the home page — navigating away unmounts (closing it) and
  // navigating back remounts fresh, so it reappears after the short delay.
  if (pathname !== "/") return null;
  return <WelcomePopupInner {...props} />;
}

function WelcomePopupInner({ title, body, slots, note, ctaLabel }: WelcomePopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-md rounded-3xl border border-accent/30 bg-ink-card p-7 shadow-glow sm:p-9"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Limited slots
            </p>
            <h2 className="mt-2 pr-8 font-display text-3xl uppercase leading-tight">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-line bg-ink px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Available slots
                </p>
                <p className="mt-1 text-sm text-fg">{slots}</p>
              </div>
              <div className="rounded-xl border border-line bg-ink px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Good to know
                </p>
                <p className="mt-1 text-sm text-fg">{note}</p>
              </div>
            </div>

            <ButtonLink href="/contact" size="lg" className="mt-7 w-full" onClick={dismiss}>
              {ctaLabel}
            </ButtonLink>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full text-center text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
