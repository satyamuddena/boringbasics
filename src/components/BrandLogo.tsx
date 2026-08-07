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
          <span className={`block whitespace-nowrap font-display uppercase leading-none text-fg ${wordmarkClassName}`}>
            {leadingWords && `${leadingWords} `}
            <span className="text-accent">{accentWord}</span>
          </span>
          {tagline && (
            <span className="mt-1 block whitespace-nowrap text-[7px] font-bold uppercase leading-none tracking-[0.2em] text-fg/85 sm:text-[8px] sm:tracking-[0.24em]">
              {taglineLeadingWords && `${taglineLeadingWords} `}
              <span className="text-accent">{taglineAccentWord}</span>{" "}
              <span className="text-accent" aria-hidden>✦</span>
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export { BrandMark };
