import type { Metadata } from "next";
import Image from "next/image";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/Button";
import { StatsBar } from "@/components/StatsBar";
import { SocialIcon } from "@/components/SocialIcon";
import { CertificateViewer } from "@/components/CertificateViewer";
import { getTrainer, getSite, getSocials } from "@/lib/content";
import { assertPageVisible } from "@/lib/pages";


export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const trainer = await getTrainer();
  return {
    title: "About",
    description: `${trainer.fullName} — ${trainer.tagline} in ${trainer.location}. ${trainer.shortBio}`,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  await assertPageVisible("about");
  const [trainer, site, socials] = await Promise.all([getTrainer(), getSite(), getSocials()]);
  return (
    <>
      <section className="relative overflow-hidden pt-24">
        <div className="accent-radial pointer-events-none absolute inset-0" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="About"
              title={<>Meet <span className="text-accent">{trainer.fullName}</span></>}
              subtitle={trainer.tagline + " · " + trainer.location}
            />
            <div className="mt-6 space-y-4">
              {trainer.bio.map((para, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <p className="leading-relaxed text-muted">{para}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.3} className="mt-8">
              <ButtonLink href="/contact" size="lg">
                Work With Me
              </ButtonLink>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="relative">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border border-line">
              <Image
                src={trainer.galleryImages[1]}
                alt={trainer.fullName}
                fill
                sizes="(max-width:1024px) 90vw, 440px"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
        </div>
      </section>

      <StatsBar />

      {/* Philosophy + certifications */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal className="rounded-2xl border border-line bg-ink-card p-8">
            <h3 className="font-display text-2xl uppercase">My Philosophy</h3>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Science-Based. Personalized. Sustainable.
            </p>
            <div className="mt-4 space-y-4">
              {trainer.philosophy.split("\n\n").map((para, i) => (
                <p key={i} className="leading-relaxed text-muted">
                  {para}
                </p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="rounded-2xl border border-line bg-ink-card p-8">
            <h3 className="font-display text-2xl uppercase">Certifications</h3>
            <ul className="mt-4 space-y-3">
              {trainer.certifications.map((c) => (
                <li key={c} className="flex gap-3 text-muted">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-accent" aria-hidden>
                    <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {c}
                </li>
              ))}
            </ul>

            {/* Certificate — opens in an in-page lightbox (admin-controlled) */}
            {trainer.certificateImage && (
              <CertificateViewer
                src={trainer.certificateImage}
                alt={`${trainer.certifications[0] ?? "Certificate"} awarded to ${trainer.fullName}`}
                caption="INFS Certificate of Completion · Verifiable at infs.co.in"
              />
            )}

            <div className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
              <a
                href={`mailto:${trainer.email}`}
                className="group flex items-center gap-3 text-muted transition-colors hover:text-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-accent transition-colors group-hover:border-accent">
                  <SocialIcon name="mail" size={16} />
                </span>
                {trainer.email}
              </a>
              {trainer.showWhatsapp && (
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
              )}
              {socials.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
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

        {/* Gallery strip */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {trainer.galleryImages.map((img, i) => (
            <Reveal key={img} delay={i * 0.06} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line">
              <Image src={img} alt={`${trainer.fullName} training`} fill sizes="(max-width:640px) 45vw, 260px" className="object-cover" />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
