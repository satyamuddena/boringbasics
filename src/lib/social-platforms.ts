/**
 * Popular social platforms for the admin dropdown. `requires` tells the admin
 * exactly what to enter; placeholders prefill the URL/handle inputs.
 * Client-safe (plain data, no dependencies).
 */
export interface SocialPlatform {
  key: string;
  label: string;
  requires: string;
  urlPlaceholder: string;
  handlePlaceholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    key: "instagram",
    label: "Instagram",
    requires: "Profile link and your handle.",
    urlPlaceholder: "https://www.instagram.com/yourhandle",
    handlePlaceholder: "@yourhandle",
  },
  {
    key: "youtube",
    label: "YouTube",
    requires: "Channel link and channel handle.",
    urlPlaceholder: "https://www.youtube.com/@yourchannel",
    handlePlaceholder: "@yourchannel",
  },
  {
    key: "facebook",
    label: "Facebook",
    requires: "Page (or profile) link and page name.",
    urlPlaceholder: "https://www.facebook.com/yourpage",
    handlePlaceholder: "Your Page Name",
  },
  {
    key: "x",
    label: "X (Twitter)",
    requires: "Profile link and your handle.",
    urlPlaceholder: "https://x.com/yourhandle",
    handlePlaceholder: "@yourhandle",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    requires: "Public profile (or company page) link and display name.",
    urlPlaceholder: "https://www.linkedin.com/in/yourname",
    handlePlaceholder: "Your Name",
  },
  {
    key: "threads",
    label: "Threads",
    requires: "Profile link and your handle.",
    urlPlaceholder: "https://www.threads.net/@yourhandle",
    handlePlaceholder: "@yourhandle",
  },
  {
    key: "telegram",
    label: "Telegram",
    requires: "Channel or group invite link and channel name.",
    urlPlaceholder: "https://t.me/yourchannel",
    handlePlaceholder: "yourchannel",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    requires: "Channel link or wa.me number link.",
    urlPlaceholder: "https://wa.me/91XXXXXXXXXX",
    handlePlaceholder: "+91 XXXXX XXXXX",
  },
  {
    key: "other",
    label: "Other / Website",
    requires: "Any https:// link and a short display name.",
    urlPlaceholder: "https://example.com",
    handlePlaceholder: "Display name",
  },
];

/** Case-insensitive lookup — tolerates legacy free-text platform names. */
export function platformFor(label: string): SocialPlatform {
  const norm = label.trim().toLowerCase();
  return (
    SOCIAL_PLATFORMS.find(
      (p) => p.key === norm || p.label.toLowerCase() === norm || norm.includes(p.key),
    ) ?? SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1]
  );
}
