import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Script from "next/script";
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
      icon: site.iconPath,
      shortcut: site.iconPath,
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
        <Script id="theme-before-paint" strategy="beforeInteractive">
          {`try{if(localStorage.getItem('boring_basics_theme')==='light')document.documentElement.classList.add('light')}catch(e){}`}
        </Script>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
