import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyCTA } from "@/components/StickyCTA";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { WelcomePopup } from "@/components/WelcomePopup";
import { PromoChrome } from "@/components/PromoChrome";
import { getSite, getTrainer, getSocials, getActivePromotions } from "@/lib/content";
import { navLinks, type SocialLink } from "@/content/site";
import { HIDEABLE_PAGES } from "@/lib/constants";

/** JSON-LD structured data: Person + LocalBusiness for local SEO. */
function buildJsonLd(
  site: Awaited<ReturnType<typeof getSite>>,
  trainer: Awaited<ReturnType<typeof getTrainer>>,
  socials: SocialLink[],
) {
  // Profile image may be a bundled "/images/.." path or an uploaded absolute URL.
  const image = trainer.profileImage.startsWith("http")
    ? trainer.profileImage
    : `${site.url}${trainer.profileImage}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: trainer.fullName,
        jobTitle: trainer.tagline,
        description: trainer.shortBio,
        image,
        email: `mailto:${trainer.email}`,
        address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressRegion: "Telangana", addressCountry: "IN" },
        sameAs: socials.map((s) => s.url),
      },
      {
        "@type": "LocalBusiness",
        "@id": `${site.url}#business`,
        name: trainer.brand,
        description: site.description,
        image,
        url: site.url,
        email: trainer.email,
        // Phone only when the trainer chose to publish it.
        ...(trainer.showWhatsapp ? { telephone: `+${trainer.whatsapp}` } : {}),
        areaServed: "Worldwide (online coaching)",
        address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressRegion: "Telangana", addressCountry: "IN" },
      },
    ],
  };
}

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [site, trainer, socials, promos] = await Promise.all([
    getSite(),
    getTrainer(),
    getSocials(),
    getActivePromotions(),
  ]);
  const jsonLd = buildJsonLd(site, trainer, socials);
  const hiddenHrefs = new Set<string>(
    HIDEABLE_PAGES.filter((p) => site.hiddenPages.includes(p.key)).map((p) => p.href),
  );
  const visibleLinks = navLinks.filter((l) => !hiddenHrefs.has(l.href));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header
        ctaLabel={site.ctaLabel}
        links={visibleLinks}
        logoPath={site.logoPath}
        brandName={trainer.brand}
        brandTagline={trainer.tagline}
      />
      {/* Renders the promo strip and owns <main>, so the strip's page offset is
          dropped at the same moment a visitor dismisses it. */}
      <PromoChrome promos={promos}>{children}</PromoChrome>
      <Footer />
      <StickyCTA ctaLabel={site.ctaLabel} />
      <WhatsAppButton />
      {site.popup.enabled && (
        <WelcomePopup
          title={site.popup.title}
          body={site.popup.body}
          slots={site.popup.slots}
          note={site.popup.note}
          ctaLabel={site.ctaLabel}
          delaySeconds={site.popup.delaySeconds}
        />
      )}
    </>
  );
}
