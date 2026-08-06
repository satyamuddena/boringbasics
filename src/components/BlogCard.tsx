import Image from "next/image";
import Link from "next/link";
import type { PostListItem } from "@/content/site";
import { BrandMark } from "./BrandLogo";
import { formatDate as formatZoned } from "@/lib/datetime";

const formatDate = (iso: string) => formatZoned(iso, "short");

export function BlogCard({ post }: { post: PostListItem }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-card transition-colors hover:border-accent/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-soft">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width:768px) 90vw, 380px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BrandMark className="h-20 w-auto opacity-40" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted">
          {post.category && <span className="text-accent">{post.category}</span>}
          <span>·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.readTimeMin ? (
            <>
              <span>·</span>
              <span>{post.readTimeMin} min read</span>
            </>
          ) : null}
        </div>
        <h3 className="mt-3 font-display text-xl uppercase leading-tight transition-colors group-hover:text-accent">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>
        <span className="mt-4 text-sm font-semibold text-accent">Read more →</span>
      </div>
    </Link>
  );
}
