import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminCard, AdminHeading, AdminListControls, AdminTable, Field, Input, Select, SubmitButton } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { SocialFields } from "@/components/admin/SocialFields";
import { SocialIcon } from "@/components/SocialIcon";
import { saveSocialAction, deleteSocialAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SocialsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; platform?: string; sort?: string }>;
}) {
  const { edit, q = "", platform = "", sort = "order" } = await searchParams;
  const db = getDb();
  const allRows = db.select().from(t.socials).orderBy(asc(t.socials.displayOrder)).all();
  const editing = edit
    ? db.select().from(t.socials).where(eq(t.socials.id, Number(edit))).get()
    : undefined;
  const platforms = [...new Set(allRows.map((r) => r.platform))].sort();
  const query = q.trim().toLowerCase();
  const rows = allRows
    .filter((r) => {
      if (platform && r.platform !== platform) return false;
      if (!query) return true;
      return [r.platform, r.handle, r.url]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "platform") return a.platform.localeCompare(b.platform);
      if (sort === "handle") return a.handle.localeCompare(b.handle);
      if (sort === "followers_desc") return (b.followers ?? 0) - (a.followers ?? 0);
      return a.displayOrder - b.displayOrder;
    });

  return (
    <>
      <AdminHeading title="Social Links" action={edit ? { href: "/admin/socials", label: "+ New" } : undefined} />

      <AdminCard title={editing ? `Edit: ${editing.platform}` : "Add social link"}>
        <form action={saveSocialAction} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <SocialFields
            key={editing?.id ?? "new"}
            defaultPlatform={editing?.platform}
            defaultUrl={editing?.url}
            defaultHandle={editing?.handle}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Followers (optional)">
              <Input name="followers" type="number" defaultValue={editing?.followers ?? ""} />
            </Field>
            <Field label="Display order">
              <Input name="displayOrder" type="number" defaultValue={editing?.displayOrder ?? 0} />
            </Field>
          </div>
          <SubmitButton>{editing ? "Save changes" : "Add link"}</SubmitButton>
        </form>
      </AdminCard>

      <div className="mt-8">
        <AdminListControls resetHref="/admin/socials">
          <Field label="Search">
            <Input name="q" defaultValue={q} placeholder="Platform, handle, URL…" />
          </Field>
          <Field label="Platform">
            <Select name="platform" defaultValue={platform}>
              <option value="">All platforms</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort">
            <Select name="sort" defaultValue={sort}>
              <option value="order">Display order</option>
              <option value="platform">Platform A-Z</option>
              <option value="handle">Handle A-Z</option>
              <option value="followers_desc">Followers high-low</option>
            </Select>
          </Field>
        </AdminListControls>
        <AdminTable headers={["Platform", "Handle", "URL", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/socials?edit=${r.id}`}
                  className="flex items-center gap-2 font-semibold hover:text-accent"
                >
                  <SocialIcon name={r.platform} size={16} className="text-muted" />
                  {r.platform}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{r.handle}</td>
              <td className="max-w-xs truncate px-4 py-3 text-muted">{r.url}</td>
              <td className="px-4 py-3 text-right">
                <DeleteForm action={deleteSocialAction.bind(null, r.id)} confirmText={`Delete ${r.platform}?`} />
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </>
  );
}
