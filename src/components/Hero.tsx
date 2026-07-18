import Image from "next/image";
import { AccentText } from "./AccentText";
import { ButtonLink } from "./Button";
import { Reveal } from "./Reveal";
import { StarRating } from "./StarRating";
import { getTrainer, getSite } from "@/lib/content";

export async function Hero() {
  const [trainer, site] = await Promise.all([getTrainer(), getSite()]);
  return (
    <section className="relative overflow-hidden pt-16">
      {/* ---------------------------------------------------------------- */}
      {/*  Faceless "body & health" background video + readability scrims  */}
      {/* ---------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <video
          className="animate-ken-burns h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/videos/hero-body-poster.jpg"
        >
          <source src="/videos/hero-body.mp4" type="video/mp4" />
        </video>
        {/* Left-weighted dark scrim keeps the copy legible over the video. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/40" />
        {/* Darken the top (behind header) and fade the base into the page. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-ink" />
        {/* Brand accent glow */}
        <div className="accent-radial absolute inset-0 opacity-70" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        {/* Copy */}
        <div className="relative z-10">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {trainer.tagline} · {trainer.location.split(",")[0]}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-xl font-display text-5xl uppercase leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              <AccentText text={site.heroHeadline} />
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">
              Personalized nutrition, workout and supplement plans guided by{" "}
              <em className="font-semibold not-italic text-white">your blood work</em> — helping you
              lose fat, build muscle, improve metabolic health and manage conditions like
              prediabetes, diabetes, high cholesterol and PCOS with{" "}
              <span className="font-semibold text-accent-soft">science-based coaching</span>.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap gap-4">
              <span className="animate-pulse-glow inline-flex">
                <ButtonLink href="/contact" size="lg">
                  Start Your Transformation
                </ButtonLink>
              </span>
              <ButtonLink href="/programs" size="lg" variant="secondary">
                View Programs
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <StarRating rating={5} />
                <span className="text-sm font-semibold text-white">Rated 5/5 by clients</span>
              </div>
              <span className="hidden text-white/40 sm:inline">·</span>
              <p className="text-sm text-white/70">
                <span className="font-semibold text-white">10+ years</span> ·{" "}
                <span className="font-semibold text-white">500+ clients</span> · INFS Certified
              </p>
            </div>
          </Reveal>
        </div>

        {/* Image */}
        <Reveal delay={0.2} className="relative">
          <div className="relative mx-auto w-full max-w-md">
            {/* Accent glow ring behind the card */}
            <div
              className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-accent-deep/30 via-accent/20 to-transparent blur-2xl"
              aria-hidden
            />
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-line shadow-glow">
              <div className="animate-ken-burns absolute inset-0 h-full w-full">
                <Image
                  src={trainer.profileImage}
                  alt={`${trainer.fullName}, ${trainer.tagline}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 440px"
                  className="object-cover object-top"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 rounded-xl border border-line bg-ink/80 px-4 py-3 backdrop-blur">
                <p className="font-display text-xl uppercase">{trainer.fullName}</p>
                <p className="text-xs text-muted">{trainer.certifications[0]}</p>
              </div>
            </div>

            {/* Floating credential badges */}
            <Reveal delay={0.5} className="absolute -left-3 top-8 hidden sm:-left-6 sm:block">
              <div
                className="animate-float rounded-2xl border border-line bg-ink-card/90 px-4 py-3 shadow-glow backdrop-blur"
                style={{ ["--float-delay" as string]: "0s" }}
              >
                <p className="font-display text-2xl leading-none text-accent">10+ yrs</p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted">Coaching</p>
              </div>
            </Reveal>
            <Reveal delay={0.62} className="absolute -right-3 top-1/3 hidden sm:-right-6 sm:block">
              <div
                className="animate-float rounded-2xl border border-line bg-ink-card/90 px-4 py-3 shadow-glow backdrop-blur"
                style={{ ["--float-delay" as string]: "-1.6s" }}
              >
                <p className="font-display text-2xl leading-none text-accent">500+</p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted">
                  Clients coached
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.74} className="absolute -right-2 bottom-10 hidden sm:-right-5 sm:block">
              <div
                className="animate-float flex items-center gap-2 rounded-full border border-line bg-ink-card/90 px-3 py-2 shadow-glow backdrop-blur"
                style={{ ["--float-delay" as string]: "-3.2s" }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="m5 13 4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-fg">INFS Certified</span>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
