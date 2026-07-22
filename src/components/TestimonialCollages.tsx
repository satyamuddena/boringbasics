import Image from "next/image";
import type { Testimonial } from "@/content/site";
import { Reveal } from "./Reveal";
import { StarRating } from "./StarRating";

/**
 * Grid of client before/after collages sourced from testimonials — the same
 * content the home-page carousel shows, laid out transformation-style.
 * Testimonials without an uploaded photo use a branded placeholder so the
 * admin's optional image field never causes content to disappear.
 */
export function TestimonialCollages({ testimonials }: { testimonials: Testimonial[] }) {
  if (!testimonials.length) return null;

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((t, i) => (
        <Reveal key={t.id} delay={(i % 3) * 0.08}>
          <figure className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-ink-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/60">
            <div className="relative aspect-[4/3] overflow-hidden bg-ink">
              {t.image ? (
                <Image
                  src={t.image}
                  alt={t.result ? `${t.clientName} — ${t.result}` : t.clientName}
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  priority={i < 3}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(255,90,10,0.24),transparent_45%),linear-gradient(145deg,#171719,#0a0a0b)] px-8 text-center">
                  <div className="absolute -left-12 -top-12 size-40 rounded-full border border-accent/15" />
                  <div className="absolute -bottom-16 -right-12 size-48 rounded-full border border-accent/10" />
                  <span className="font-display text-8xl leading-none text-accent/70" aria-hidden>
                    “
                  </span>
                  <p className="mt-4 max-w-52 font-display text-2xl uppercase tracking-wide text-fg">
                    Real client. Real progress.
                  </p>
                  <span className="mt-6 h-px w-16 bg-accent/70" aria-hidden />
                </div>
              )}
            </div>
            <figcaption className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <StarRating rating={t.rating} />
                {t.result && (
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    {t.result}
                  </span>
                )}
              </div>
              <blockquote className="text-sm leading-relaxed text-muted">
                “{t.quote}”
              </blockquote>
              <p className="mt-auto pt-1 text-sm font-semibold text-fg">{t.clientName}</p>
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
