import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  wordmarkClassName?: string;
  /** Overrides the mark's size — the admin rail has far less room than a header. */
  markClassName?: string;
  tagline?: string;
  openInNewTab?: boolean;
  /**
   * Rendered on permanently dark media (the home hero, behind the transparent
   * header) rather than on a themed surface, so the text is fixed to white and
   * the accent stays vivid instead of following the theme.
   *
   * A prop rather than something the caller passes through `className`: the
   * colour classes below and a `text-white` from the caller land in the same
   * Tailwind layer, so which one wins is decided by stylesheet order, not by
   * the order of the class attribute.
   */
  onDark?: boolean;
};

function BrandMark({
  className = "h-9 w-auto",
  src = "/brand/boring-basics-mark-client.png",
  brandName = "Boring Basics",
}: {
  className?: string;
  src?: string;
  brandName?: string;
}) {
  return (
    <Image
      src={src}
      alt={`${brandName} logo`}
      width={760}
      height={510}
      unoptimized={src.startsWith("/uploads/")}
      className={className}
    />
  );
}

export function BrandLogo({
  compact = false,
  className = "",
  logoPath = "/brand/boring-basics-mark-client.png",
  brandName = "Boring Basics",
  wordmarkClassName = "text-xl tracking-[0.08em]",
  markClassName,
  tagline,
  openInNewTab = false,
  onDark = false,
}: BrandLogoProps & { logoPath?: string; brandName?: string }) {
  const words = brandName.trim().split(/\s+/);
  const accentWord = words.pop() || brandName;
  const leadingWords = words.join(" ");
  const taglineWords = tagline?.trim().split(/\s+/) ?? [];
  const taglineAccentWord = taglineWords.pop();
  const taglineLeadingWords = taglineWords.join(" ");

  return (
    <Link
      href="/"
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      aria-label={`${brandName} home`}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <BrandMark
        src={logoPath}
        brandName={brandName}
        className={
          markClassName ??
          `${tagline ? "h-9 sm:h-10" : "h-10"} w-auto shrink-0 rounded-md object-contain`
        }
      />
      {!compact && (
        <span className={tagline ? "border-l border-accent pl-2.5 sm:pl-3" : undefined}>
          <span
            className={`block whitespace-nowrap font-display uppercase leading-none ${
              onDark ? "text-white" : "text-fg"
            } ${wordmarkClassName}`}
          >
            {leadingWords && `${leadingWords} `}
            <span className={onDark ? "text-accent-vivid" : "text-accent"}>{accentWord}</span>
          </span>
          {tagline && (
            <span
              className={`mt-1 block whitespace-nowrap text-[7px] font-bold uppercase leading-none tracking-[0.2em] sm:text-[8px] sm:tracking-[0.24em] ${
                onDark ? "text-white/85" : "text-fg/85"
              }`}
            >
              {taglineLeadingWords && `${taglineLeadingWords} `}
              <span className={onDark ? "text-accent-vivid" : "text-accent"}>{taglineAccentWord}</span>
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export { BrandMark };
