/** Shared with proxy.ts — keep this file dependency-free. */
export const SESSION_COOKIE = "admin_session";

/** Day labels for the popup availability pickers (order matters). */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/**
 * Pages the admin can hide (nav + sitemap + URL 404). Home and Contact are
 * always visible — the site core and the conversion path.
 */
export const HIDEABLE_PAGES = [
  { key: "about", label: "About", href: "/about" },
  { key: "programs", label: "Programs", href: "/programs" },
  { key: "testimonials", label: "Testimonials", href: "/testimonials" },
  { key: "tools", label: "Tools", href: "/tools" },
  { key: "blog", label: "Blog", href: "/blog" },
] as const;

export type PageKey = (typeof HIDEABLE_PAGES)[number]["key"];
