import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminHeading, AdminListControls, AdminTable, Field, Input, Select, StatusPill } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { deletePostAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PostsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; sort?: string }>;
}) {
  const { q = "", status = "", category = "", sort = "newest" } = await searchParams;
  const allPosts = getDb().select().from(t.posts).orderBy(desc(t.posts.publishedAt)).all();
  const query = q.trim().toLowerCase();
  const categories = [...new Set(allPosts.map((p) => p.category).filter(Boolean))].sort();
  const posts = allPosts
    .filter((p) => {
      const postStatus = p.isPublished ? "published" : "draft";
      if (status && postStatus !== status) return false;
      if (category && p.category !== category) return false;
      if (!query) return true;
      return [p.title, p.slug, p.excerpt, p.category, postStatus]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "oldest") return a.publishedAt.localeCompare(b.publishedAt);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "status") return Number(a.isPublished) - Number(b.isPublished) || b.publishedAt.localeCompare(a.publishedAt);
      return b.publishedAt.localeCompare(a.publishedAt);
    });
  return (
    <>
      <AdminHeading title="Blog Posts" action={{ href: "/admin/posts/new", label: "+ New post" }} />
      <AdminListControls resetHref="/admin/posts">
        <Field label="Search">
          <Input name="q" defaultValue={q} placeholder="Title, slug, excerpt…" />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c!}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sort">
          <Select name="sort" defaultValue={sort}>
            <option value="newest">Newest published first</option>
            <option value="oldest">Oldest published first</option>
            <option value="title">Title A-Z</option>
            <option value="status">Status</option>
          </Select>
        </Field>
      </AdminListControls>
      <AdminTable headers={["Title", "Category", "Published", "Status", ""]}>
        {posts.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/posts/${p.id}`} className="font-semibold hover:text-accent">
                {p.title}
              </Link>
              <span className="block text-xs text-muted">/blog/{p.slug}</span>
            </td>
            <td className="px-4 py-3 text-muted">{p.category ?? "—"}</td>
            <td className="px-4 py-3 text-muted">{p.publishedAt.slice(0, 10)}</td>
            <td className="px-4 py-3">
              <StatusPill value={p.isPublished ? "published" : "draft"} />
            </td>
            <td className="px-4 py-3 text-right">
              <DeleteForm action={deletePostAction.bind(null, p.id)} confirmText={`Delete "${p.title}"?`} />
            </td>
          </tr>
        ))}
        {posts.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-muted">
              No posts yet — write your first article.
            </td>
          </tr>
        )}
      </AdminTable>
    </>
  );
}
