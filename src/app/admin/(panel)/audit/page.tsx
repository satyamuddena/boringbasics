import Link from "next/link";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminHeading, AdminListControls, Field, Select, AdminTable } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function pretty(jsonStr: string | null): string {
  if (!jsonStr) return "";
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 1);
  } catch {
    return jsonStr;
  }
}

export default async function AuditAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; page?: string; sort?: string }>;
}) {
  const { entity, action, page, sort = "newest" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const db = getDb();

  const filters: SQL[] = [];
  if (entity) filters.push(eq(t.auditLog.entityType, entity));
  if (action) filters.push(eq(t.auditLog.action, action));

  const rows = db
    .select()
    .from(t.auditLog)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(sort === "oldest" ? asc(t.auditLog.id) : desc(t.auditLog.id))
    .limit(PAGE_SIZE + 1)
    .offset((pageNum - 1) * PAGE_SIZE)
    .all();
  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  const entityTypes = db
    .selectDistinct({ v: t.auditLog.entityType })
    .from(t.auditLog)
    .all()
    .map((r) => r.v);
  const actions = db
    .selectDistinct({ v: t.auditLog.action })
    .from(t.auditLog)
    .all()
    .map((r) => r.v);

  const filterLink = (params: Record<string, string | undefined>) => {
    const merged = { entity, action, sort, ...params };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <AdminHeading title="Audit Log" />

      <AdminListControls resetHref="/admin/audit">
        {entity && <input type="hidden" name="entity" value={entity} />}
        {action && <input type="hidden" name="action" value={action} />}
        <Field label="Sort">
          <Select name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </Field>
      </AdminListControls>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link
          href="/admin/audit"
          className={`rounded-full border px-3 py-1 ${!entity && !action ? "border-accent text-accent" : "border-line text-muted"}`}
        >
          All
        </Link>
        {entityTypes.map((e) => (
          <Link
            key={e}
            href={filterLink({ entity: e === entity ? undefined : e })}
            className={`rounded-full border px-3 py-1 ${entity === e ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}
          >
            {e}
          </Link>
        ))}
        <span className="mx-2 text-muted">·</span>
        {actions.map((a) => (
          <Link
            key={a}
            href={filterLink({ action: a === action ? undefined : a })}
            className={`rounded-full border px-3 py-1 ${action === a ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}
          >
            {a.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <AdminTable headers={["When", "Actor", "Action", "Entity", "Change"]}>
        {visible.map((a) => (
          <tr key={a.id} className="align-top">
            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
              {new Date(a.at).toLocaleString("en-IN")}
              {a.ip && <span className="block text-muted/60">{a.ip}</span>}
            </td>
            <td className="px-4 py-3 text-xs">{a.actor}</td>
            <td className="px-4 py-3 text-xs">{a.action.replace(/_/g, " ")}</td>
            <td className="px-4 py-3 text-xs text-muted">
              {a.entityType}
              {a.entityId ? ` #${a.entityId}` : ""}
            </td>
            <td className="px-4 py-3">
              {(a.beforeJson || a.afterJson) && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted hover:text-accent">view</summary>
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    {a.beforeJson && (
                      <pre className="max-h-48 overflow-auto rounded-lg border border-line bg-ink p-2 text-bad/80">
                        {pretty(a.beforeJson)}
                      </pre>
                    )}
                    {a.afterJson && (
                      <pre className="max-h-48 overflow-auto rounded-lg border border-line bg-ink p-2 text-ok/80">
                        {pretty(a.afterJson)}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </td>
          </tr>
        ))}
        {visible.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-muted">
              No entries.
            </td>
          </tr>
        )}
      </AdminTable>

      <div className="mt-4 flex gap-3 text-sm">
        {pageNum > 1 && (
          <Link href={filterLink({ page: String(pageNum - 1) })} className="text-muted hover:text-accent">
            ← Newer
          </Link>
        )}
        {hasMore && (
          <Link href={filterLink({ page: String(pageNum + 1) })} className="text-muted hover:text-accent">
            Older →
          </Link>
        )}
      </div>
    </>
  );
}
