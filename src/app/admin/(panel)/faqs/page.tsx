import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminCard, AdminHeading, AdminListControls, AdminTable, Field, Input, Select, Textarea, SubmitButton } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { saveFaqAction, deleteFaqAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FaqsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; category?: string; sort?: string }>;
}) {
  const { edit, q = "", category = "", sort = "order" } = await searchParams;
  const db = getDb();
  const allRows = db.select().from(t.faqs).orderBy(asc(t.faqs.displayOrder)).all();
  const editing = edit ? db.select().from(t.faqs).where(eq(t.faqs.id, Number(edit))).get() : undefined;
  const categories = [...new Set(allRows.map((r) => r.category))].sort();
  const query = q.trim().toLowerCase();
  const rows = allRows
    .filter((r) => {
      if (category && r.category !== category) return false;
      if (!query) return true;
      return [r.question, r.answer, r.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "question") return a.question.localeCompare(b.question);
      if (sort === "category") return a.category.localeCompare(b.category) || a.displayOrder - b.displayOrder;
      return a.displayOrder - b.displayOrder;
    });

  return (
    <>
      <AdminHeading title="FAQs" action={edit ? { href: "/admin/faqs", label: "+ New" } : undefined} />

      <AdminCard title={editing ? "Edit FAQ" : "Add FAQ"}>
        <form action={saveFaqAction} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Field label="Question">
            <Input name="question" defaultValue={editing?.question} required />
          </Field>
          <Field label="Answer">
            <Textarea name="answer" defaultValue={editing?.answer} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" hint={`Existing: ${categories.join(", ") || "—"}`}>
              <Input name="category" defaultValue={editing?.category ?? "General"} list="faq-categories" />
              <datalist id="faq-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Display order">
              <Input name="displayOrder" type="number" defaultValue={editing?.displayOrder ?? 0} />
            </Field>
          </div>
          <SubmitButton>{editing ? "Save changes" : "Add FAQ"}</SubmitButton>
        </form>
      </AdminCard>

      <div className="mt-8">
        <AdminListControls resetHref="/admin/faqs">
          <Field label="Search">
            <Input name="q" defaultValue={q} placeholder="Question, answer…" />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort">
            <Select name="sort" defaultValue={sort}>
              <option value="order">Display order</option>
              <option value="question">Question A-Z</option>
              <option value="category">Category A-Z</option>
            </Select>
          </Field>
        </AdminListControls>
        <AdminTable headers={["Question", "Category", "Order", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="max-w-lg px-4 py-3">
                <Link href={`/admin/faqs?edit=${r.id}`} className="font-semibold hover:text-accent">
                  {r.question}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{r.category}</td>
              <td className="px-4 py-3 text-muted">{r.displayOrder}</td>
              <td className="px-4 py-3 text-right">
                <DeleteForm action={deleteFaqAction.bind(null, r.id)} confirmText="Delete this FAQ?" />
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </>
  );
}
