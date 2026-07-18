import Image from "next/image";
import Link from "next/link";
import type { Program } from "@/content/site";
import { goalLabels } from "@/content/site";
import { ButtonLink } from "./Button";

export function ProgramCard({
  program,
}: {
  program: Program;
}) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-ink-card transition-all duration-300 hover:-translate-y-1 ${
        program.popular
          ? "border-accent shadow-glow"
          : "border-line hover:border-accent/60"
      }`}
    >
      {program.popular && (
        <span className="absolute right-4 top-4 z-10 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
          Most Popular
        </span>
      )}

      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={program.image}
          alt={program.title}
          fill
          sizes="(max-width: 768px) 100vw, 380px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-card via-ink-card/30 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-2xl uppercase">{program.title}</h3>
        <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-muted">
          {program.shortDescription}
        </p>

        <div className="mt-4 min-h-[4.5rem] content-start flex flex-wrap gap-2">
          {program.goalTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-muted"
            >
              {goalLabels[tag]}
            </span>
          ))}
        </div>

        <ul className="mt-5 min-h-[13rem] space-y-2 text-sm">
          {program.features.slice(0, 3).map((f) => (
            <li key={f} className="flex gap-2 text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-accent" aria-hidden>
                <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </li>
          ))}
          {program.features.length > 3 && (
            <li className="pl-6 text-xs text-muted/70">
              + {program.features.length - 3} more inclusions
            </li>
          )}
        </ul>

        <div className="mt-auto pt-6">
          <ButtonLink
            href={`/programs/${program.slug}`}
            variant="secondary"
            className="w-full"
            aria-label={`Learn more about ${program.title}`}
          >
            View details
          </ButtonLink>
        </div>
      </div>

      {/* Invisible full-card link for the title area only (keeps buttons clickable) */}
      <Link
        href={`/programs/${program.slug}`}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      >
        {program.title} details
      </Link>
    </article>
  );
}
