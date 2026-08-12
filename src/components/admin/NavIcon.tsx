/** Nav glyphs — inline so the admin adds no icon-library weight. */
export type NavIconName =
  | "dashboard"
  | "about"
  | "programs"
  | "testimonials"
  | "faqs"
  | "socials"
  | "posts"
  | "newsletter"
  | "bookings"
  | "analytics"
  | "whatsapp"
  | "payments"
  | "bell"
  | "diagnostics"
  | "sync"
  | "settings"
  | "devices"
  | "audit";

const PATHS: Record<NavIconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  programs: (
    <>
      <path d="M6.5 8v8M17.5 8v8" />
      <path d="M3.5 10v4M20.5 10v4" />
      <path d="M6.5 12h11" />
    </>
  ),
  testimonials: (
    <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.14 1 5.87L12 16.9l-5.25 2.77 1-5.87L3.5 9.66l5.9-.86L12 3.5z" />
  ),
  faqs: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
      <path d="M12 17h.01" />
    </>
  ),
  socials: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  posts: (
    <>
      <path d="M5 4.5h9l5 5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M13.5 4.5V10h5.5M8.5 14h7M8.5 17h4.5" />
    </>
  ),
  newsletter: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  bookings: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      <path d="M9 14l2 2 4-4" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 19.5V13M10 19.5V9M16 19.5V5" />
      <path d="M3 19.5h18M4 10l6-4 6 2 5-5" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.5 11.7a8.2 8.2 0 0 1-11.9 7.3L3.5 20.5l1.6-5A8.2 8.2 0 1 1 20.5 11.7z" />
      <path d="M9.2 9.4c.3 2.6 2.3 4.6 4.9 4.9" />
    </>
  ),
  payments: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 10h19M6 14.5h3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  diagnostics: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="M6 12h2.8l2-3.8 2.4 7 2-3.2H18" />
    </>
  ),
  sync: (
    <>
      <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M17.5 3v3.6h-3.6M6.5 21v-3.6h3.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1 2 2 0 1 1-4 0 1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7 2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1 2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7 2 2 0 1 1 0 4 1.6 1.6 0 0 0-1.4 1z" />
    </>
  ),
  devices: (
    <>
      <rect x="2.5" y="5" width="13" height="9.5" rx="1.5" />
      <path d="M2.5 18h13" />
      <rect x="17.5" y="9" width="4" height="9" rx="1" />
    </>
  ),
  audit: (
    <>
      <path d="M8 4.5H6.5A1.5 1.5 0 0 0 5 6v13a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V6a1.5 1.5 0 0 0-1.5-1.5H16" />
      <rect x="8" y="2.5" width="8" height="4" rx="1.2" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </>
  ),
};

export function NavIcon({ name, className = "" }: { name: NavIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
