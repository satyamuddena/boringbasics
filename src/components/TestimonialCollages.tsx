import Image from "next/image";
import type { Testimonial } from "@/content/site";
import { Reveal } from "./Reveal";
import { StarRating } from "./StarRating";

/**
 * Grid of client before/after collages sourced from testimonials — the same
 * content the home-page carousel shows, laid out transformation-style.
 * Only testimonials that have an image appear here.
 */
export function TestimonialCollages({ testimonials }: { testimonials: Testimonial[] }) {
  const items = testimonials.filter((t) => t.image);
  if (!items.length) return null;

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t, i) => (
        <Reveal key={t.id} delay={(i % 3) * 0.08}>
          <figure className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-ink-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/60">
            <div className="relative aspect-[3/4] overflow-hidden bg-ink">
              <Image
                src={t.image!}
                alt={t.result ? `${t.clientName} — ${t.result}` : t.clientName}
                fill
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                priority={i < 3}
              />
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
              <blockquote className="text-sm leading-relaxed text-muted line-clamp-4">
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
