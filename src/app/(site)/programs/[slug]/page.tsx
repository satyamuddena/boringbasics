import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/Button";
import { goalLabels } from "@/content/site";
import { getProgram, getConsultation, getSite } from "@/lib/content";
import { assertPageVisible } from "@/lib/pages";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return { title: "Program not found" };
  return {
    title: program.title,
    description: program.shortDescription,
    alternates: { canonical: `/programs/${program.slug}` },
  };
}

export default async function ProgramDetailPage({ params }: Params) {
  await assertPageVisible("programs");
  const { slug } = await params;
  const [program, consultation, site] = await Promise.all([
    getProgram(slug),
    getConsultation(),
    getSite(),
  ]);
  if (!program) notFound();

  return (
    <article className="pt-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Link href="/programs" className="text-sm text-muted transition-colors hover:text-accent">
          ← All programs
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <Reveal className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line">
            <Image
              src={program.image}
              alt={program.title}
              fill
              sizes="(max-width:1024px) 90vw, 520px"
              className="object-cover"
              priority
            />
            {program.popular && (
              <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
                Most Popular
              </span>
            )}
          </Reveal>

          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {program.durationLabel} · Online Coaching
            </span>
            <h1 className="mt-3 font-display text-4xl uppercase sm:text-5xl">
              {program.title}
            </h1>
            <p className="mt-4 leading-relaxed text-muted">{program.fullDescription}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {program.goalTags.map((tag) => (
                <span key={tag} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                  {goalLabels[tag]}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <span className="text-sm font-semibold text-fg">Enquire for pricing</span>
              <ButtonLink href="/contact" size="lg">
                {site.ctaLabel}
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* What's included */}
        <Reveal className="mt-16 rounded-2xl border border-line bg-ink-card p-8">
          <h2 className="font-display text-2xl uppercase">What&apos;s included</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {program.features.map((f) => (
              <li key={f} className="flex gap-3 text-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-accent" aria-hidden>
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Consultation note */}
        <Reveal className="my-16 rounded-2xl border border-accent/40 bg-ink-card p-8 text-center shadow-glow">
          <h2 className="font-display text-2xl uppercase">Ready to begin?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Book a {consultation.durationLabel} consultation call for ₹
            {consultation.price.toLocaleString("en-IN")}. {consultation.note}
          </p>
          <ButtonLink href="/contact" size="lg" className="mt-6">
            {site.ctaLabel}
          </ButtonLink>
        </Reveal>
      </div>
    </article>
  );
}
