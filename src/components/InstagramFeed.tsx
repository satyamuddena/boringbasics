import { getSocials } from "@/lib/content";

interface IgMedia {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
  media_type: string;
  thumbnail_url?: string;
}

/**
 * Fetches recent posts via the Instagram Graph API when INSTAGRAM_ACCESS_TOKEN
 * is set. Returns null on any failure so the UI falls back to a follow card —
 * the section is never broken whether or not the token is configured.
 */
async function fetchInstagram(): Promise<IgMedia[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const fields = "id,media_url,permalink,caption,media_type,thumbnail_url";
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=${fields}&limit=8&access_token=${token}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: IgMedia[] };
    return (data.data || []).slice(0, 8);
  } catch {
    return null;
  }
}

const imgFor = (m: IgMedia) => (m.media_type === "VIDEO" ? m.thumbnail_url || m.media_url : m.media_url);

export async function InstagramFeed() {
  const [media, socials] = await Promise.all([fetchInstagram(), getSocials()]);
  const ig = socials.find((s) => s.platform.toLowerCase() === "instagram");
  const profileUrl = ig?.url || "https://www.instagram.com";
  const handle = ig?.handle || "@satya_muddena";

  // Fallback: no token / fetch failed → a clean "follow" card.
  if (!media || media.length === 0) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center gap-4 rounded-2xl border border-line bg-ink-card p-10 text-center transition-colors hover:border-accent/60 sm:flex-row sm:justify-between sm:text-left"
      >
        <div>
          <h3 className="font-display text-2xl uppercase">Follow the journey</h3>
          <p className="mt-2 text-muted">
            Daily tips, client wins and behind-the-scenes coaching on Instagram{" "}
            <span className="text-accent">{handle}</span>
            {ig?.followers ? ` · ${Math.round(ig.followers / 1000)}K followers` : ""}.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold uppercase tracking-wider text-ink transition-transform group-hover:scale-105">
          Follow on Instagram
        </span>
      </a>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {media.map((m) => (
          <a
            key={m.id}
            href={m.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square overflow-hidden rounded-xl border border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgFor(m)}
              alt={m.caption?.slice(0, 80) || "Instagram post"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <span className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/30" />
          </a>
        ))}
      </div>
      <div className="mt-6 text-center">
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-accent hover:underline"
        >
          Follow {handle} on Instagram →
        </a>
      </div>
    </div>
  );
}
