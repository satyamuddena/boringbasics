import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/Button";
import { MarkdownBody } from "@/components/MarkdownBody";
import { getPost, getSite } from "@/lib/content";
import { assertPageVisible } from "@/lib/pages";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: post.coverImage
      ? { type: "article", images: [{ url: post.coverImage }], title: post.title, description: post.excerpt }
      : { type: "article", title: post.title, description: post.excerpt },
  };
}

/** Estimate reading time from the markdown body when the editor hasn't set one. */
function estimateReadTime(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function BlogPostPage({ params }: Params) {
  await assertPageVisible("blog");
  const { slug } = await params;
  const [post, site] = await Promise.all([getPost(slug), getSite()]);
  if (!post) notFound();

  const readTime = post.readTimeMin || estimateReadTime(post.body || "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    image: post.coverImage ? [post.coverImage] : undefined,
    author: { "@type": "Person", name: site.name },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
  };

  return (
    <article className="pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link href="/blog" className="text-sm text-muted transition-colors hover:text-accent">
          ← All articles
        </Link>

        <div className="mt-6 flex items-center gap-2 text-xs text-muted">
          {post.category && <span className="text-accent">{post.category}</span>}
          <span>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span>·</span>
          <span>{readTime} min read</span>
        </div>

        <h1 className="mt-3 font-display text-4xl uppercase leading-tight sm:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-lg leading-relaxed text-muted">{post.excerpt}</p>}
      </div>

      {post.coverImage && (
        <Reveal className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-line">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width:896px) 92vw, 880px"
              className="object-cover"
              priority
            />
          </div>
        </Reveal>
      )}

      <div className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
        <MarkdownBody source={post.body || ""} />
      </div>

      <Reveal className="mx-auto my-16 max-w-3xl px-4 sm:px-6">
        <div className="rounded-2xl border border-accent/40 bg-ink-card p-8 text-center shadow-glow">
          <h2 className="font-display text-2xl uppercase">Ready to put this into action?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Get a plan built around your goals and your blood work. Book a consultation call.
          </p>
          <ButtonLink href="/contact" size="lg" className="mt-6">
            {site.ctaLabel}
          </ButtonLink>
        </div>
      </Reveal>
    </article>
  );
}
