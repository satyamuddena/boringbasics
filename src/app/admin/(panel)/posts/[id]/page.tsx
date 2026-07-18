import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminHeading } from "@/components/admin/ui";
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
        <p className="mb-4 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">
          Saved.{" "}
          {post.isPublished && (
            <Link href={`/blog/${post.slug}`} target="_blank" className="underline">
              View on site →
            </Link>
          )}
        </p>
      )}
      <PostForm post={post} />
    </>
  );
}
