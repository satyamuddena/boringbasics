import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/Button";
import { BlogCard } from "@/components/BlogCard";
import { getPosts, getSite } from "@/lib/content";
import { assertPageVisible } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Blog & Fitness Tips",
  description:
    "Practical, science-led fitness, nutrition and lifestyle tips for fat loss, muscle building and sustainable habits.",
  alternates: { canonical: "/blog" },
};


export const dynamic = "force-dynamic";
export default async function BlogPage() {
  await assertPageVisible("blog");
  const [posts, site] = await Promise.all([getPosts(), getSite()]);

  return (
    <>
      <section className="relative overflow-hidden pt-28">
        <div className="accent-radial pointer-events-none absolute inset-0" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Blog & Tips"
            title="Fitness, simplified"
            subtitle="No-nonsense advice on training, nutrition and building habits that actually last."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {posts.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.06}>
                <BlogCard post={post} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal className="mx-auto max-w-xl rounded-2xl border border-dashed border-line bg-ink-card p-10 text-center">
            <h2 className="font-display text-2xl uppercase">Articles coming soon</h2>
            <p className="mx-auto mt-3 text-muted">
              Fresh fitness and nutrition tips are on the way. In the meantime, book a
              consultation and let&apos;s build your plan.
            </p>
            <ButtonLink href="/contact" size="lg" className="mt-6">
              {site.ctaLabel}
            </ButtonLink>
          </Reveal>
        )}
      </section>
    </>
  );
}
