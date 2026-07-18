import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminHeading, AdminListControls, AdminTable, Field, Input, Select, StatusPill } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { deleteProgramAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProgramsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; popular?: string; sort?: string }>;
}) {
  const { q = "", popular = "", sort = "order" } = await searchParams;
  const allPrograms = getDb().select().from(t.programs).orderBy(asc(t.programs.displayOrder)).all();
  const query = q.trim().toLowerCase();
  const programs = allPrograms
    .filter((p) => {
      if (popular === "yes" && !p.popular) return false;
      if (popular === "no" && p.popular) return false;
      if (!query) return true;
      return [p.title, p.slug, p.durationLabel, p.shortDescription]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "duration") return a.durationLabel.localeCompare(b.durationLabel);
      return a.displayOrder - b.displayOrder;
    });
  return (
    <>
      <AdminHeading title="Programs" action={{ href: "/admin/programs/new", label: "+ New program" }} />
      <AdminListControls resetHref="/admin/programs">
        <Field label="Search">
          <Input name="q" defaultValue={q} placeholder="Title, slug, duration…" />
        </Field>
        <Field label="Popular">
          <Select name="popular" defaultValue={popular}>
            <option value="">All programs</option>
            <option value="yes">Popular only</option>
            <option value="no">Not popular</option>
          </Select>
        </Field>
        <Field label="Sort">
          <Select name="sort" defaultValue={sort}>
            <option value="order">Display order</option>
            <option value="title">Title A-Z</option>
            <option value="price_asc">Price low-high</option>
            <option value="price_desc">Price high-low</option>
            <option value="duration">Duration A-Z</option>
          </Select>
        </Field>
      </AdminListControls>
      <AdminTable headers={["Title", "Duration", "Price (₹)", "Popular", "Order", ""]}>
        {programs.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/programs/${p.id}`} className="font-semibold hover:text-accent">
                {p.title}
              </Link>
              <span className="block text-xs text-muted">/{p.slug}</span>
            </td>
            <td className="px-4 py-3 text-muted">{p.durationLabel}</td>
            <td className="px-4 py-3 text-muted">{p.price.toLocaleString("en-IN")}</td>
            <td className="px-4 py-3">{p.popular ? <StatusPill value="popular" /> : <span className="text-muted">—</span>}</td>
            <td className="px-4 py-3 text-muted">{p.displayOrder}</td>
            <td className="px-4 py-3 text-right">
              <DeleteForm
                action={deleteProgramAction.bind(null, p.id)}
                confirmText={`Delete "${p.title}"?`}
                label="Delete"
              />
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
