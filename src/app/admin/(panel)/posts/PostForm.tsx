import type { schema } from "@/db";
import { AdminCard, Field, Input, Textarea, Checkbox, SubmitButton } from "@/components/admin/ui";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { savePostAction } from "./actions";

type PostRow = typeof schema.posts.$inferSelect;

const json = <T,>(s: string | undefined, fb: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fb;
  } catch {
    return fb;
  }
};

export function PostForm({ post }: { post?: PostRow }) {
  const tags = json<string[]>(post?.tagsJson, []);
  return (
    <form action={savePostAction} className="max-w-3xl space-y-6">
      {post && <input type="hidden" name="id" value={post.id} />}
      <AdminCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input name="title" defaultValue={post?.title} required />
          </Field>
          <Field label="Slug" hint="Leave empty to generate from the title.">
            <Input name="slug" defaultValue={post?.slug} />
          </Field>
          <Field label="Category" hint="e.g. Nutrition, Training">
            <Input name="category" defaultValue={post?.category ?? ""} />
          </Field>
          <Field label="Tags" hint="Comma separated.">
            <Input name="tags" defaultValue={tags.join(", ")} />
          </Field>
          <Field label="Published at" hint="ISO date — controls ordering.">
            <Input name="publishedAt" type="date" defaultValue={(post?.publishedAt ?? new Date().toISOString()).slice(0, 10)} />
          </Field>
          <Field label="Read time (min)" hint="Leave empty to auto-estimate.">
            <Input name="readTimeMin" type="number" defaultValue={post?.readTimeMin ?? ""} />
          </Field>
        </div>
        <div className="mt-4 space-y-4">
          <Field label="Excerpt">
            <Textarea name="excerpt" defaultValue={post?.excerpt} required />
          </Field>
          <ImageUploadField name="coverImage" label="Cover image" kind="post" defaultValue={post?.coverImage ?? ""} />
          <Field
            label="Body (Markdown)"
            hint="Headings: ## Heading — Lists: - item — Bold: **text** — Links: [text](url) — Images: ![alt](/uploads/…)"
          >
            <Textarea name="body" rows={18} defaultValue={post?.bodyMd} className="font-mono text-xs" />
          </Field>
          <Checkbox name="isPublished" label="Published (visible on the site)" defaultChecked={post?.isPublished ?? false} />
          <div>
            <Checkbox name="notify" label="Email subscribers about this post" />
            <p className="mt-1 pl-6 text-xs text-muted/70">
              Sends the newsletter once when you save (published posts only) — leave unchecked
              on later edits to avoid duplicate emails.
            </p>
          </div>
        </div>
      </AdminCard>
      <SubmitButton>{post ? "Save post" : "Create post"}</SubmitButton>
    </form>
  );
}
