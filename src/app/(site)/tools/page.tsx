import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/Button";
import { getSite } from "@/lib/content";
import { BmiCalculator } from "@/components/calculators/BmiCalculator";
import { TdeeCalculator } from "@/components/calculators/TdeeCalculator";
import { OneRepMaxCalculator } from "@/components/calculators/OneRepMaxCalculator";
import { assertPageVisible } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Free Fitness Calculators",
  description:
    "Free fitness tools to calculate your BMI, daily calories and macros (TDEE), and estimate your one-rep max.",
  alternates: { canonical: "/tools" },
};

export default async function ToolsPage() {
  await assertPageVisible("tools");
  const site = await getSite();
  return (
    <>
      <section className="relative overflow-hidden pt-28">
        <div className="accent-radial pointer-events-none absolute inset-0" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Free Tools"
            title="Fitness calculators"
            subtitle="Quick estimates to guide your training and nutrition. For a plan built around you, book a consultation."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <Reveal>
            <TdeeCalculator />
          </Reveal>
          <div className="space-y-8">
            <Reveal delay={0.08}>
              <BmiCalculator />
            </Reveal>
            <Reveal delay={0.16}>
              <OneRepMaxCalculator />
            </Reveal>
          </div>
        </div>

        <Reveal className="mt-12 rounded-2xl border border-accent/40 bg-ink-card p-8 text-center shadow-glow">
          <h2 className="font-display text-2xl uppercase sm:text-3xl">Numbers are just the start</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            These are general estimates. Your custom plan is built around your goals, lifestyle and latest
            blood work — let&apos;s find what actually works for you.
          </p>
          <ButtonLink href="/contact" size="lg" className="mt-6">
            {site.ctaLabel}
          </ButtonLink>
        </Reveal>
      </section>
    </>
  );
}
