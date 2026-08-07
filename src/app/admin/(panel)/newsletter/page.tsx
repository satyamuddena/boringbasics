import { and, desc, eq, gt, or } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminAlert, AdminCard, AdminHeading, AdminListControls, AdminTable, AdminTabs, Field, Input, Select, StatusPill } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { smtpConfigured } from "@/lib/mail";
import { clearTestNotificationsAction, sendNewsletterAction, deleteSubscriberAction } from "./actions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { NewsletterSendControls } from "@/components/admin/NewsletterSendButton";
import { sanitizeRichText } from "@/lib/richText";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewsletterAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; total?: string; failed?: string; error?: string; mode?: string; recipient?: string; cleared?: string; tab?: string; q?: string; status?: string; source?: string; sort?: string }>;
}) {
  const admin = await requireAdmin();
  const { sent, total, error, mode, recipient, cleared, tab = "compose", q = "", status = "", source = "", sort = "newest" } = await searchParams;
  const activeTab = tab === "history" ? "history" : "compose";
  const db = getDb();
  const allSubscribers = db
    .select()
    .from(t.subscribers)
    .orderBy(desc(t.subscribers.id))
    .all();
  const query = q.trim().toLowerCase();
  const sources = [...new Set(allSubscribers.map((s) => s.source))].sort();
  const subscribers = allSubscribers
    .filter((s) => {
      if (status && s.status !== status) return false;
      if (source && s.source !== source) return false;
      if (!query) return true;
      return [s.email, s.name, s.source, s.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "oldest") return a.id - b.id;
      if (sort === "email") return a.email.localeCompare(b.email);
      if (sort === "status") return a.status.localeCompare(b.status) || b.id - a.id;
      return b.id - a.id;
    });
  const active = allSubscribers.filter((s) => s.status === "subscribed").length;
  const clearBoundary = activeTab === "history"
    ? db
        .select({ id: t.auditLog.id })
        .from(t.auditLog)
        .where(and(eq(t.auditLog.action, "newsletter_test_history_cleared"), eq(t.auditLog.entityType, "newsletter")))
        .orderBy(desc(t.auditLog.id))
        .limit(1)
        .get()?.id ?? 0
    : 0;
  const history = activeTab === "history"
    ? db
        .select()
        .from(t.auditLog)
        .where(and(
          eq(t.auditLog.entityType, "newsletter"),
          or(
            eq(t.auditLog.action, "newsletter_sent"),
            and(eq(t.auditLog.action, "newsletter_test_sent"), gt(t.auditLog.id, clearBoundary)),
          ),
        ))
        .orderBy(desc(t.auditLog.id))
        .limit(50)
        .all()
        .map((row) => {
          try {
            return { ...row, details: JSON.parse(row.afterJson ?? "{}") as { subject?: string; html?: string; paragraphs?: string[]; cta?: { label: string; url: string }; recipient?: string; test?: boolean; total?: number; sent?: number; failed?: number } };
          } catch {
            return { ...row, details: {} as { subject?: string; html?: string; paragraphs?: string[]; cta?: { label: string; url: string }; recipient?: string; test?: boolean; total?: number; sent?: number; failed?: number } };
          }
        })
    : [];
  const hasTestNotifications = activeTab === "history" && Boolean(
    db
      .select({ id: t.auditLog.id })
      .from(t.auditLog)
      .where(and(
        eq(t.auditLog.entityType, "newsletter"),
        eq(t.auditLog.action, "newsletter_test_sent"),
        gt(t.auditLog.id, clearBoundary),
      ))
      .limit(1)
      .get(),
  );

  return (
    <>
      <AdminHeading title="Newsletter" />

      {sent != null && !error && (
        <AdminAlert tone="ok">
          {mode === "test"
            ? `Test newsletter sent to ${recipient}.`
            : `Newsletter sent to ${sent} of ${total} subscriber${Number(total) === 1 ? "" : "s"}.`}
        </AdminAlert>
      )}
      {cleared && (
        <AdminAlert tone="ok">
          All test notifications were cleared from Sent history. Broadcast history was not changed.
        </AdminAlert>
      )}
      {error === "missing" && (
        <AdminAlert tone="bad">Subject and message are both required.</AdminAlert>
      )}
      {error === "invalid-cta" && (
        <AdminAlert tone="bad">
          Add both a button label and a valid http(s) button link, or leave both fields blank.
        </AdminAlert>
      )}
      {error === "invalid-test-email" && (
        <AdminAlert tone="bad">Enter a valid test recipient email address.</AdminAlert>
      )}
      {error === "invalid-action" && (
        <AdminAlert tone="bad">Choose either test delivery or broadcast delivery.</AdminAlert>
      )}
      {error === "smtp_auth" && (
        <AdminAlert tone="bad">
          SMTP login was rejected. Update <code>SMTP_USER</code> and <code>SMTP_PASS</code> with the mailbox credentials from your email provider, then restart the server.
        </AdminAlert>
      )}
      {error === "smtp_delivery" && (
        <AdminAlert tone="bad">
          The email provider could not deliver the newsletter. Check the server log for the provider error.
        </AdminAlert>
      )}
      {!smtpConfigured() && (
        <AdminAlert>
          ⚠ SMTP is not configured (<code>SMTP_HOST/PORT/USER/PASS</code>), so newsletters are
          logged to the server console instead of actually being emailed.
        </AdminAlert>
      )}

      <AdminTabs
        active={activeTab}
        surface="card"
        tabs={[
          { key: "compose", label: "Compose & subscribers", href: "/admin/newsletter" },
          { key: "history", label: "Sent history", href: "/admin/newsletter?tab=history" },
        ]}
      />

      {activeTab === "history" ? (
        <AdminCard flush title="Sent newsletters">
          <div className="space-y-3">
            {hasTestNotifications && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink px-4 py-3">
                <p className="text-sm text-muted">Remove all test deliveries from this history while keeping broadcasts.</p>
                <DeleteForm
                  action={clearTestNotificationsAction}
                  label="Clear all test notifications"
                  confirmText="Clear all test notifications from Sent history? Broadcast history will remain."
                />
              </div>
            )}
            {history.map((entry) => {
              const body = entry.details.html ?? entry.details.paragraphs?.map((p) => `<p>${p}</p>`).join("") ?? "";
              return (
                <details key={entry.id} className="rounded-xl border border-line bg-ink p-4">
                  <summary className="cursor-pointer list-none pr-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{entry.details.subject ?? "Newsletter"}</span>
                      {entry.details.test && <StatusPill value="test" />}
                      <span className="text-xs text-muted">{formatDateTime(entry.at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Sent by {entry.actor} · {entry.details.sent ?? 0} of {entry.details.total ?? 0} delivered
                      {entry.details.recipient ? ` · ${entry.details.recipient}` : ""}
                      {entry.details.failed ? ` · ${entry.details.failed} failed` : ""}
                    </p>
                  </summary>
                  {body && <div className="mt-4 border-t border-line pt-4 [&_a]:text-accent [&_a]:underline [&_p]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_strong]:text-fg" dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }} />}
                  {entry.details.cta && <a className="mt-2 inline-block text-sm font-semibold text-accent underline" href={entry.details.cta.url} target="_blank" rel="noopener noreferrer">{entry.details.cta.label} →</a>}
                </details>
              );
            })}
            {history.length === 0 && <p className="py-8 text-center text-sm text-muted">No newsletters have been recorded yet. Future sends will appear here.</p>}
          </div>
        </AdminCard>
      ) : <>
      <AdminCard flush title={`Send a newsletter (${active} active subscriber${active === 1 ? "" : "s"})`}>
        <form action={sendNewsletterAction} className="space-y-4">
          <Field label="Subject">
            <Input name="subject" required placeholder="e.g. 5 habits that make fat loss stick" />
          </Field>
          <Field label="Message" hint="Use the toolbar for headings, emphasis, lists and links. Pasted text is kept plain for a consistent email layout.">
            <RichTextEditor name="body" minHeight="16rem" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label (optional)" hint='e.g. "Read the full post"'>
              <Input name="ctaLabel" />
            </Field>
            <Field label="Button link (optional)">
              <Input name="ctaUrl" type="url" placeholder="https://…" />
            </Field>
          </div>
          <p className="text-xs text-muted/70">
            Every email is sent individually with the subscriber&apos;s own unsubscribe link.
          </p>
          <Field label="Test recipient" hint="A test goes only to this address and appears in Sent history. It does not change your subscriber list.">
            <Input name="testEmail" type="email" defaultValue={admin.email} placeholder="you@example.com" />
          </Field>
          <NewsletterSendControls subscriberCount={active} />
        </form>
      </AdminCard>

      <div className="mt-6">
        <AdminListControls resetHref="/admin/newsletter">
          <Field label="Search">
            <Input name="q" defaultValue={q} placeholder="Email, name, source…" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={status}>
              <option value="">All statuses</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </Select>
          </Field>
          <Field label="Source">
            <Select name="source" defaultValue={source}>
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort">
            <Select name="sort" defaultValue={sort}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="email">Email A-Z</option>
              <option value="status">Status A-Z</option>
            </Select>
          </Field>
        </AdminListControls>
        <AdminTable
          headers={["Email", "Name", "Source", "Status", "Since", ""]}
          empty={
            allSubscribers.length === 0
              ? "No subscribers yet — signups come from the footer box and the consultation form opt-in."
              : "No subscribers match these filters."
          }
        >
          {subscribers.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-semibold">{s.email}</td>
              <td className="px-4 py-3 text-muted">{s.name ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{s.source}</td>
              <td className="px-4 py-3">
                <StatusPill value={s.status} />
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {formatDate(s.createdAt, "short")}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteForm
                  action={deleteSubscriberAction.bind(null, s.id)}
                  confirmText={`Delete subscriber "${s.email}"?`}
                />
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
      </>}
    </>
  );
}
