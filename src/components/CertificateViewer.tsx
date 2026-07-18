"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/** Never fires — used with useSyncExternalStore purely for SSR/client detection. */
const emptySubscribe = () => () => {};

interface CertificateViewerProps {
  src: string;
  alt: string;
  /** Thumbnail box aspect ratio, e.g. "3/2". The full image is shown uncropped. */
  ratio?: string;
  caption: string;
}

/**
 * Certification thumbnail that opens the full image in an in-page lightbox
 * (no new tab). Closes on Escape, backdrop click or the close button.
 */
export function CertificateViewer({ src, alt, ratio = "3/2", caption }: CertificateViewerProps) {
  const [open, setOpen] = useState(false);
  // Portal target — only available after mount (avoids SSR document access).
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View the full INFS certificate"
        className="group mt-6 block w-full overflow-hidden rounded-xl border border-line text-left transition-colors hover:border-accent"
      >
        <div className="relative w-full" style={{ aspectRatio: ratio }}>
          <Image src={src} alt={alt} fill sizes="(max-width:1024px) 90vw, 520px" className="object-cover" />
        </div>
        <span className="block bg-ink-soft px-4 py-2 text-xs text-muted transition-colors group-hover:text-accent">
          {caption}
        </span>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
                onClick={close}
                role="dialog"
                aria-modal="true"
                aria-label={alt}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-ink-card shadow-glow"
                  onClick={(e) => e.stopPropagation()}
                  style={{ aspectRatio: ratio }}
                >
                  <Image src={src} alt={alt} fill sizes="(max-width:1024px) 92vw, 900px" className="object-contain" priority />
                </motion.div>

                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink/70 text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
