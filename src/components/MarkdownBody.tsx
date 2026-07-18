import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Styled markdown renderer for blog posts and event descriptions.
 * Element classes mirror the previous Portable Text renderer exactly so the
 * typography is unchanged.
 */
const components: Components = {
  h1: ({ children }) => <h2 className="mt-10 font-display text-3xl uppercase">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-10 font-display text-3xl uppercase">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 font-display text-2xl uppercase">{children}</h3>,
  p: ({ children }) => <p className="mt-4 leading-relaxed text-muted">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-accent pl-4 italic text-muted">{children}</blockquote>
  ),
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-muted">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  a: ({ children, href }) => {
    const external = (href || "").startsWith("http");
    return (
      <a
        href={href || "#"}
        className="text-accent underline underline-offset-2 hover:opacity-80"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    if (!src || typeof src !== "string") return null;
    return (
      <span className="my-8 block overflow-hidden rounded-2xl border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || ""} loading="lazy" className="h-auto w-full object-cover" />
      </span>
    );
  },
};

export function MarkdownBody({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
}
