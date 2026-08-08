import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { getSite, getTrainer } from "@/lib/content";

const anton = Anton({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [site, trainer] = await Promise.all([getSite(), getTrainer()]);
  // Uploaded assets use content-hashed filenames. The query also ensures the
  // bundled fallback does not remain stuck in browsers' long-lived favicon cache.
  const iconVersion = encodeURIComponent(site.iconPath.split("/").pop() || "brand-icon");
  const iconUrl = `${site.iconPath}${site.iconPath.includes("?") ? "&" : "?"}v=${iconVersion}`;
  return {
    metadataBase: new URL(site.url),
    title: {
      default: site.title,
      template: `%s | ${trainer.brand}`,
    },
    description: site.description,
    keywords: site.keywords,
    authors: [{ name: trainer.fullName }],
    creator: trainer.fullName,
    applicationName: trainer.brand,
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
    },
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: site.url,
      siteName: trainer.brand,
      title: site.title,
      description: site.description,
      images: [{ url: site.ogImage, width: 1200, height: 630, alt: `${trainer.brand} — ${trainer.tagline}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.title,
      description: site.description,
      images: [site.ogImage],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = await getSite();
  const brandStyles = {
    "--brand-accent": site.accentColor,
    "--brand-background": site.backgroundColor,
    "--brand-foreground": site.foregroundColor,
  } as CSSProperties;
  return (
    <html
      lang="en"
      className={`${anton.variable} ${inter.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      style={brandStyles}
    >
      <body className="flex min-h-full flex-col bg-ink text-fg">
        {/*
          A raw <script>, not next/script. `strategy="beforeInteractive"` with
          inline children never reaches the served HTML as an executable tag —
          it is serialized into the RSC flight payload and only runs after
          hydration, so a stored light preference was silently ignored on every
          page load. React streams this element into the markup as-is, so the
          browser runs it while parsing, before any of the page paints.
          Must stay the first child of <body> for that to hold.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('boring_basics_theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
