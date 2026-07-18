import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminCard, AdminHeading, AdminListControls, AdminTable, Field, Input, Select, Textarea, Checkbox, SubmitButton } from "@/components/admin/ui";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { saveTestimonialAction, deleteTestimonialAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TestimonialsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; featured?: string; sort?: string }>;
}) {
  const { edit, q = "", featured = "", sort = "order" } = await searchParams;
  const db = getDb();
  const allRows = db.select().from(t.testimonials).orderBy(asc(t.testimonials.displayOrder)).all();
  const editing = edit
    ? db.select().from(t.testimonials).where(eq(t.testimonials.id, Number(edit))).get()
    : undefined;
  const query = q.trim().toLowerCase();
  const rows = allRows
    .filter((r) => {
      if (featured === "yes" && !r.featured) return false;
      if (featured === "no" && r.featured) return false;
      if (!query) return true;
      return [r.clientName, r.quote, r.result]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "client") return a.clientName.localeCompare(b.clientName);
      if (sort === "rating_desc") return b.rating - a.rating;
      if (sort === "rating_asc") return a.rating - b.rating;
      return a.displayOrder - b.displayOrder;
    });

  return (
    <>
      <AdminHeading
        title="Testimonials"
        action={edit ? { href: "/admin/testimonials", label: "+ New" } : undefined}
      />

      <AdminCard title={editing ? `Edit: ${editing.clientName}` : "Add testimonial"}>
        <form action={saveTestimonialAction} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name">
              <Input name="clientName" defaultValue={editing?.clientName} required />
            </Field>
            <Field label="Result" hint="e.g. Lost 14 kg in 24 weeks">
              <Input name="result" defaultValue={editing?.result ?? ""} />
            </Field>
            <Field label="Rating (1–5)">
              <Input name="rating" type="number" min={1} max={5} defaultValue={editing?.rating ?? 5} />
            </Field>
            <Field label="Display order">
              <Input name="displayOrder" type="number" defaultValue={editing?.displayOrder ?? 0} />
            </Field>
          </div>
          <Field label="Quote">
            <Textarea name="quote" defaultValue={editing?.quote} required />
          </Field>
          <ImageUploadField name="image" label="Client photo (optional)" kind="testimonial" defaultValue={editing?.image ?? ""} />
          <Checkbox name="featured" label="Featured on homepage" defaultChecked={editing?.featured ?? false} />
          <SubmitButton>{editing ? "Save changes" : "Add testimonial"}</SubmitButton>
        </form>
      </AdminCard>

      <div className="mt-8">
        <AdminListControls resetHref="/admin/testimonials">
          <Field label="Search">
            <Input name="q" defaultValue={q} placeholder="Client, result, quote…" />
          </Field>
          <Field label="Featured">
            <Select name="featured" defaultValue={featured}>
              <option value="">All testimonials</option>
              <option value="yes">Featured only</option>
              <option value="no">Not featured</option>
            </Select>
          </Field>
          <Field label="Sort">
            <Select name="sort" defaultValue={sort}>
              <option value="order">Display order</option>
              <option value="client">Client A-Z</option>
              <option value="rating_desc">Rating high-low</option>
              <option value="rating_asc">Rating low-high</option>
            </Select>
          </Field>
        </AdminListControls>
        <AdminTable headers={["Client", "Quote", "Rating", "Featured", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">
                <Link href={`/admin/testimonials?edit=${r.id}`} className="font-semibold hover:text-accent">
                  {r.clientName}
                </Link>
              </td>
              <td className="max-w-md px-4 py-3 text-muted">
                <span className="line-clamp-2">{r.quote}</span>
              </td>
              <td className="px-4 py-3 text-muted">{"★".repeat(r.rating)}</td>
              <td className="px-4 py-3">{r.featured ? "★" : ""}</td>
              <td className="px-4 py-3 text-right">
                <DeleteForm action={deleteTestimonialAction.bind(null, r.id)} confirmText={`Delete "${r.clientName}"?`} />
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </>
  );
}
