import Link from "next/link";
import { navLinks } from "@/content/site";
import { HIDEABLE_PAGES } from "@/lib/constants";
import { getTrainer, getSocials, getSite } from "@/lib/content";
import { SocialIcon } from "./SocialIcon";
import { SubscribeBox } from "./SubscribeBox";
import { BrandLogo } from "./BrandLogo";

export async function Footer() {
  const [trainer, socials, site] = await Promise.all([
    getTrainer(),
    getSocials(),
    getSite(),
  ]);
  const hiddenHrefs = new Set<string>(
    HIDEABLE_PAGES.filter((p) => site.hiddenPages.includes(p.key)).map((p) => p.href),
  );
  const links = navLinks.filter((l) => !hiddenHrefs.has(l.href));
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ink-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <BrandLogo logoPath={site.logoPath} brandName={trainer.brand} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {trainer.shortBio}
          </p>
          <p className="mt-4 text-sm text-muted">
            {trainer.fullName} · {trainer.location}
          </p>
          <div className="mt-6 max-w-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">
              Newsletter
            </h3>
            <SubscribeBox />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">
            Explore
          </h3>
          <ul className="mt-4 space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">
            Get in touch
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                href={`mailto:${trainer.email}`}
                className="inline-flex items-center gap-2 text-muted transition-colors hover:text-accent"
              >
                <SocialIcon name="mail" size={16} />
                {trainer.email}
              </a>
            </li>
            {trainer.showWhatsapp && (
              <li>
                <a
                  href={site.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-muted transition-colors hover:text-accent"
                >
                  <SocialIcon name="whatsapp" size={16} />
                  +{trainer.whatsapp}
                </a>
              </li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
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
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} {trainer.brand}. All rights reserved.
          </p>
          <p className="text-muted">
            Results vary from person to person. Coaching is not a substitute for
            medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
