import type { Metadata, Viewport } from "next";

/**
 * Wraps both the login page and the panel, and exists only to declare the
 * installable-app metadata for /admin.
 *
 * The manifest is linked from here rather than added as the root
 * `src/app/manifest.ts` file convention on purpose: a root manifest applies to
 * the whole site, which would offer visitors to the public marketing pages an
 * install prompt for the trainer's admin app.
 */
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  // iOS ignores the manifest for home-screen installs and reads these instead.
  // The title is what appears under the icon, where iOS truncates at roughly
  // twelve characters — "BoringBasics" fits, "Boring Basics Admin" does not.
  appleWebApp: {
    capable: true,
    title: "BoringBasics",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  // Standalone mode draws under the notch and the home indicator; without this
  // the top of the bookings list sits behind the status bar on an iPhone.
  viewportFit: "cover",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
