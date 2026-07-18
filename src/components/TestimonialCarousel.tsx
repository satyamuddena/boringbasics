"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { Testimonial } from "@/content/site";
import { StarRating } from "./StarRating";

export function TestimonialCarousel({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const [index, setIndex] = useState(0);
  const count = testimonials.length;

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  // Auto-advance every 7s; pauses are inherent (resets on manual nav via index dep).
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;
  const t = testimonials[index];

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-card p-8 sm:p-12">
        <svg
          className="absolute right-6 top-6 text-line"
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
        </svg>

        <AnimatePresence mode="wait">
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className={t.image ? "grid items-center gap-8 md:grid-cols-[minmax(0,300px)_1fr]" : undefined}
          >
            {t.image && (
              <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-xl border border-line bg-ink">
                <Image
                  src={t.image}
                  alt={t.result ? `${t.clientName} — ${t.result}` : t.clientName}
                  fill
                  sizes="(max-width: 768px) 80vw, 300px"
                  className="object-contain"
                />
              </div>
            )}
            <blockquote>
              <StarRating rating={t.rating} className="mb-4" />
              <p className="text-lg leading-relaxed text-fg sm:text-xl">
                “{t.quote}”
              </p>
              <footer className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 font-display text-lg text-accent">
                  {t.clientName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-fg">{t.clientName}</p>
                  {t.result && <p className="text-sm text-accent">{t.result}</p>}
                </div>
              </footer>
            </blockquote>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous testimonial"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex gap-2">
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-accent" : "w-2 bg-line hover:bg-muted"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next testimonial"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
