import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminCard, AdminHeading, StatusPill } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const db = getDb();
  const c = (q: string) => db.get<{ c: number }>(sql.raw(`SELECT COUNT(*) AS c FROM ${q}`))?.c ?? 0;

  const stats = [
    { label: "New bookings", value: c("leads WHERE status = 'new'"), href: "/admin/leads" },
    { label: "Paid bookings", value: c("leads WHERE stage IN ('paid','booked')"), href: "/admin/leads" },
    { label: "Booked (scheduled)", value: c("leads WHERE stage = 'booked'"), href: "/admin/leads" },
    { label: "Newsletter subscribers", value: c("subscribers WHERE status = 'subscribed'"), href: "/admin/newsletter" },
    { label: "Blog posts", value: c("posts"), href: "/admin/posts" },
    { label: "Programs", value: c("programs"), href: "/admin/programs" },
  ];

  const recentAudit = db.select().from(t.auditLog).orderBy(desc(t.auditLog.id)).limit(8).all();
  const recentLeads = db.select().from(t.leads).orderBy(desc(t.leads.id)).limit(5).all();

  return (
    <>
      <AdminHeading title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <div className="rounded-2xl border border-line bg-ink-card p-5 transition-colors group-hover:border-accent/50">
              <p className="font-display text-4xl text-accent">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AdminCard title="Latest bookings">
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted">No bookings yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {l.name} <span className="text-muted">· {l.whatsapp}</span>
                  </span>
                  <StatusPill value={l.status} />
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
        <AdminCard title="Recent activity">
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentAudit.map((a) => (
                <li key={a.id} className="text-sm text-muted">
                  <span className="text-fg">{a.actor}</span> {a.action.replace(/_/g, " ")}{" "}
                  {a.entityType}
                  {a.entityId ? ` #${a.entityId}` : ""}
                  <span className="block text-xs text-muted/60">
                    {new Date(a.at).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </>
  );
}
