import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";
import { ButtonLink } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { TestimonialCollages } from "@/components/TestimonialCollages";
import { getTestimonials } from "@/lib/content";
import { assertPageVisible } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Testimonials",
  description:
    "Real online coaching results for fat loss, muscle gain and body recomposition, in the clients' own words.",
  alternates: { canonical: "/testimonials" },
};


export const dynamic = "force-dynamic";
export default async function TestimonialsPage() {
  await assertPageVisible("testimonials");
  const testimonials = await getTestimonials();

  return (
    <>
      <section className="relative overflow-hidden pt-28">
        <div className="accent-radial pointer-events-none absolute inset-0" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Testimonials"
            title="The proof is in the progress"
            subtitle="Real clients, real results — coached fully online, in their own words."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <TestimonialCollages testimonials={testimonials} />

        <Reveal className="mt-16 rounded-2xl border border-accent/40 bg-ink-card p-8 text-center shadow-glow">
          <h2 className="font-display text-2xl uppercase sm:text-3xl">
            Your transformation could be next
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Book a consultation call and let&apos;s build the plan that gets you
            there.
          </p>
          <ButtonLink href="/contact" size="lg" className="mt-6">
            Start Now
          </ButtonLink>
        </Reveal>
      </section>
    </>
  );
}
