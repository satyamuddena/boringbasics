import Image from "next/image";
import { AccentText } from "@/components/AccentText";
import { Hero } from "@/components/Hero";
import { StatsBar } from "@/components/StatsBar";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/Button";
import { ProgramCard } from "@/components/ProgramCard";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { FaqAccordion } from "@/components/FaqAccordion";
import { FaqJsonLd } from "@/components/FaqJsonLd";
import { InstagramFeed } from "@/components/InstagramFeed";
import {
  getPrograms,
  getTestimonials,
  getFaqs,
  getTrainer,
  getConsultation,
  getSite,
} from "@/lib/content";

const steps = [
  {
    n: "01",
    title: "Apply",
    text: "Book a consultation call and tell me about your goals, lifestyle and health.",
  },
  {
    n: "02",
    title: "Assessment",
    text: "We review your latest blood work, current routine and what's realistic for you.",
  },
  {
    n: "03",
    title: "Custom Plan",
    text: "You get a nutrition, supplement and training plan built specifically for you.",
  },
  {
    n: "04",
    title: "Coaching & Tracking",
    text: "Daily check-ins, form reviews and a weekly call keep you on track to results.",
  },
];


export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [programs, testimonials, faqs, trainer, consultation, site] =
    await Promise.all([
      getPrograms(),
      getTestimonials(),
      getFaqs(),
      getTrainer(),
      getConsultation(),
      getSite(),
    ]);
  return (
    <>
      <Hero />
      <StatsBar />

      {/* About teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="relative order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line">
                <Image src={trainer.galleryImages[1]} alt={trainer.fullName} fill sizes="(max-width:1024px) 45vw, 260px" className="object-cover" />
              </div>
              <div className="relative mt-8 aspect-[3/4] overflow-hidden rounded-2xl border border-line">
                <Image src={trainer.galleryImages[3]} alt={trainer.fullName} fill sizes="(max-width:1024px) 45vw, 260px" className="object-cover" />
              </div>
            </div>
          </Reveal>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="About Me"
              title={<AccentText text={site.aboutHeading} />}
              subtitle={trainer.bio[1]}
            />
            <Reveal delay={0.1} className="mt-6">
              <ul className="space-y-3">
                {[
                  "10+ years of strength training, 5+ years coaching clients",
                  "INFS-Certified Nutrition & Fitness Consultant",
                  "Plans built around your latest blood work",
                  "Fat loss, muscle gain, photoshoot prep & lifestyle conditions",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-muted">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-accent" aria-hidden>
                      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/about" variant="secondary" className="mt-8">
                More about me
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="border-t border-line bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Coaching Packages"
            title="Choose your transformation"
            subtitle="Every package carries the same complete support — pick the timeframe that fits your goal. Book a consultation for pricing and the right fit."
          />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {programs.map((p) => (
              <Reveal key={p.slug} delay={p.displayOrder * 0.08} className="h-full">
                <ProgramCard program={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          align="center"
          eyebrow="How It Works"
          title="Four simple steps"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08} className="relative rounded-2xl border border-line bg-ink-card p-6">
              <span className="font-display text-5xl text-accent/30">{s.n}</span>
              <h3 className="mt-3 font-display text-xl uppercase">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonials — client results in their own words */}
      <section id="testimonials" className="border-t border-line bg-ink-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Testimonials"
            title="Real results, real words"
            className="mb-12"
          />
          <TestimonialCarousel testimonials={testimonials.filter((t) => t.featured)} />
          <Reveal className="mt-10 text-center">
            <ButtonLink href="/testimonials" variant="secondary">
              View all testimonials
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-ink-soft">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="FAQ"
            title="Questions, answered"
            className="mb-12"
          />
          <FaqAccordion faqs={faqs} />
          <FaqJsonLd faqs={faqs} />
        </div>
      </section>

      {/* Instagram */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading align="center" eyebrow="Instagram" title="Follow the journey" className="mb-12" />
        <Reveal>
          <InstagramFeed />
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="accent-radial pointer-events-none absolute inset-0" aria-hidden />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <Reveal>
            <h2 className="font-display text-4xl uppercase sm:text-6xl">
              Ready to <span className="text-accent">start?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
              Book a {consultation.durationLabel} consultation call for ₹
              {consultation.price.toLocaleString("en-IN")}. {consultation.note}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <ButtonLink href="/contact" size="lg">
                {site.ctaLabel}
              </ButtonLink>
              <ButtonLink href="/programs" size="lg" variant="secondary">
                See Packages
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
