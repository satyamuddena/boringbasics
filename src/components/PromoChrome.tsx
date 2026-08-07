"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActivePromo } from "@/lib/content";
import { isScrollEffect } from "@/lib/promoBannerCore";

const ROTATE_MS = 6000;

/**
 * Owns the promotion strip *and* the page offset it needs, because the two have
 * to disappear together: with the padding on the server-rendered layout,
 * dismissing the banner left a 44px gap at the top of every page.
 *
 * `promo-on` drives both the offset and the hero's cancellation of it, so one
 * class toggle keeps them in step. It is rendered by the server when a
 * promotion is live, so there is no layout shift on hydration.
 *
 * Dismissal is deliberately in-memory only: it quiets the strip for the rest of
 * that visit, and a reload brings it back. Persisting it would let one click
 * hide a promotion for the whole browser session — the same reasoning as the
 * WelcomePopup, which the client asked to show on every load.
 */
export function PromoChrome({
  promos,
  children,
}: {
  promos: ActivePromo[];
  children: React.ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const visible = promos.length > 0 && !dismissed;

  useEffect(() => {
    if (promos.length < 2 || !visible) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % promos.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [promos.length, visible]);

  const promo = promos[Math.min(index, Math.max(promos.length - 1, 0))];

  return (
    <>
      {visible && promo && (
        <div
          // top-16 clears the fixed 64px header; below the header's z-50 so the
          // mobile menu panel still drops over it. Translucent + blurred like
          // the header, so the hero video reads through it rather than being
          // cut by a solid band.
          className="fixed inset-x-0 top-16 z-40 border-b border-accent-deep/30 bg-accent/85 text-ink backdrop-blur"
          role="region"
          aria-label="Promotion"
        >
          {/* Height comes from --promo-h in globals.css, which also drives the
              page offset — see the .promo-on rules there. */}
          <div className="promo-strip mx-auto flex max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Link
              href={promo.href}
              // 13px rather than text-sm: the family and weight match the
              // header's CTA, but 14px reads heavy in a 36px strip.
              className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold tracking-[0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {isScrollEffect(promo.effect) ? (
                /*
                  Two identical tracks side by side, each sliding a full track
                  width: as the first leaves, the second is exactly where it
                  began, so the loop is seamless.

                  Each track repeats the text so it is at least as wide as the
                  strip — with a single copy, short text on a desktop bar leaves
                  most of the strip empty and the promo reads as a glitch.
                  Only the first copy is announced; the rest are decorative.
                */
                <span className="promo-marquee">
                  {[0, 1].map((track) => (
                    <span
                      key={track}
                      className={`promo-marquee-track ${
                        promo.effect === "scroll-reverse" ? "promo-marquee-track--reverse" : ""
                      }`}
                      aria-hidden={track === 1}
                    >
                      {[0, 1, 2].map((copy) => (
                        <span key={copy} aria-hidden={track === 0 && copy > 0 ? true : undefined}>
                          {promo.bannerText}
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
              ) : (
                <span className={`truncate ${promo.effect === "flash" ? "promo-flash" : ""}`}>
                  {promo.bannerText}
                </span>
              )}
              <span aria-hidden className="shrink-0">
                →
              </span>
              {promo.ctaLabel && <span className="sr-only">{promo.ctaLabel}</span>}
            </Link>

            {promos.length > 1 && (
              <div className="flex shrink-0 items-center gap-1.5">
                {promos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show promotion ${i + 1} of ${promos.length}`}
                    aria-current={i === index}
                    className={`h-1.5 w-1.5 rounded-full bg-ink transition-opacity ${
                      i === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss promotion"
              className="shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className={`flex-1 ${visible ? "promo-on" : ""}`}>{children}</main>
    </>
  );
}
