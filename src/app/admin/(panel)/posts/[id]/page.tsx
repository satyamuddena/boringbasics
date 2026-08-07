import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminAlert, AdminHeading } from "@/components/admin/ui";
import { getPromoFor } from "@/lib/promoBanner";
import { PostForm } from "../PostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const post = getDb().select().from(t.posts).where(eq(t.posts.id, Number(id))).get();
  if (!post) notFound();
  return (
    <>
      <AdminHeading title={`Edit: ${post.title}`} />
      {saved && (
        <AdminAlert tone="ok">
          Saved.{" "}
          {post.isPublished && (
            <Link href={`/blog/${post.slug}`} target="_blank" className="underline">
              View on site →
            </Link>
          )}
        </AdminAlert>
      )}
      <PostForm post={post} promo={getPromoFor("post", post.id)} />
    </>
  );
}
