import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { LeadForm } from "@/components/LeadForm";
import { SocialIcon } from "@/components/SocialIcon";
import { getTrainer, getSite, getConsultation, getSocials } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact & Booking",
  description:
    "Book a consultation call and share your goals for a custom online coaching plan covering fat loss, muscle gain or lifestyle health.",
  alternates: { canonical: "/contact" },
};


export const dynamic = "force-dynamic";
export default async function ContactPage() {
  const [trainer, site, consultation, socials] = await Promise.all([
    getTrainer(),
    getSite(),
    getConsultation(),
    getSocials(),
  ]);
  return (
    <>
      <section className="relative overflow-hidden pt-28">
        <div className="accent-radial pointer-events-none absolute inset-0" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <SectionHeading
            eyebrow="Contact & Booking"
            title={<>Book your <span className="text-accent">consultation</span></>}
            subtitle={`Tell me your goal, secure your ${consultation.durationLabel} call, then pick a time that works — all in a couple of minutes.`}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Booking wizard */}
          <Reveal>
            <LeadForm calendlyUrl={site.calendlyUrl} consultation={consultation} brandName={trainer.brand} />
          </Reveal>

          {/* Booking info + direct contact */}
          <div className="space-y-8">
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-accent/40 bg-ink-card p-6 shadow-glow">
                <h3 className="font-display text-xl uppercase">Consultation call</h3>
                <p className="mt-3 font-display text-4xl text-accent">
                  ₹{consultation.price.toLocaleString("en-IN")}
                  <span className="ml-2 text-base text-muted">· {consultation.durationLabel}</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{consultation.note}</p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="rounded-2xl border border-line bg-ink-card p-6">
                <h3 className="font-display text-xl uppercase">How booking works</h3>
                <ol className="mt-4 space-y-3 text-sm text-muted">
                  <li className="flex gap-3">
                    <span className="font-display text-accent">1</span>
                    Send the form with your goals and a preferred date &amp; time.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-display text-accent">2</span>
                    I confirm your slot on WhatsApp — usually within a few hours.
                  </li>
                  <li className="flex gap-3">
                    <span className="font-display text-accent">3</span>
                    We meet on a video call and map out your plan.
                  </li>
                </ol>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="rounded-2xl border border-line bg-ink-card p-6">
                <h3 className="font-display text-xl uppercase">Reach me directly</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {trainer.showWhatsapp && (
                    <li>
                      <a
                        href={site.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 text-muted transition-colors hover:text-accent"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-accent transition-colors group-hover:border-accent">
                          <SocialIcon name="whatsapp" size={16} />
                        </span>
                        +{trainer.whatsapp}
                      </a>
                    </li>
                  )}
                  <li>
                    <a
                      href={`mailto:${trainer.email}`}
                      className="group flex items-center gap-3 text-muted transition-colors hover:text-accent"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-accent transition-colors group-hover:border-accent">
                        <SocialIcon name="mail" size={16} />
                      </span>
                      {trainer.email}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(trainer.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 text-muted transition-colors hover:text-accent"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-accent transition-colors group-hover:border-accent">
                        <SocialIcon name="map-pin" size={16} />
                      </span>
                      {trainer.location} · Online worldwide
                    </a>
                  </li>
                </ul>
                {socials.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
                    {socials.map((s) => (
                      <a
                        key={`${s.platform}-${s.url}`}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${s.platform} — ${s.handle} (opens in a new tab)`}
                        title={`${s.platform} ${s.handle}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        <SocialIcon name={s.platform} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
