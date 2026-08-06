import { and, desc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminHeading, AdminListControls, AdminTable, Field, Input, Select, StatusPill } from "@/components/admin/ui";
import { BookingStageSummary } from "@/components/admin/BookingProgressBar";
import { BookingTabs, type BookingTab } from "@/components/admin/BookingTabs";
import { BookingCard } from "@/components/admin/BookingCard";
import { PushToggle } from "@/components/admin/PushToggle";
import { setLeadStatusAction } from "./actions";
import { BookingDetails, type NotifyRecord } from "./BookingDetails";
import { LeadWhatsAppButton } from "./LeadWhatsAppButton";
import {
  ageLabel,
  bookingProgress,
  dateTime,
  inBookingTab,
  type BookingTabKey,
} from "@/lib/bookingProgress";
import { syncStaleCalendlyEvents } from "@/lib/calendlySync";
import { whatsAppDelivery } from "@/lib/whatsappDelivery";
import { getTrainer } from "@/lib/content";

export const dynamic = "force-dynamic";

const TONE_CLASS = { ok: "text-ok", warn: "text-warn", bad: "text-bad" } as const;

/** What an empty tab should say — silence on the busiest tab is good news. */
const EMPTY_TAB: Record<string, string> = {
  upcoming: "No calls coming up.",
  needs: "Nothing is waiting on you. All caught up.",
  unpaid: "Nobody is stuck at the payment step.",
  notime: "Everyone who paid has picked a time.",
  closed: "You have not closed any bookings yet.",
  all: "No bookings yet.",
};

/** Plain words for the trainer's own follow-up state. */
const FOLLOWUP_LABEL: Record<string, string> = {
  new: "Not contacted",
  contacted: "Contacted",
  closed: "Closed",
};

/**
 * Latest notification result per lead per audience. Read from the audit log so
 * no extra table is needed — rows arrive newest-first and the first hit wins.
 *
 * Delivery receipts fetched later by "Check if it arrived" are merged in on top
 * of the send record. Without that, checking a message told you the truth once
 * and the screen went straight back to showing the send-time guess.
 */
function loadNotifications(): Map<number, Partial<Record<"trainer" | "customer", NotifyRecord>>> {
  const byLead = new Map<number, Partial<Record<"trainer" | "customer", NotifyRecord>>>();
  const rows = getDb()
    .select()
    .from(t.auditLog)
    .where(and(eq(t.auditLog.action, "whatsapp_booking_notify"), eq(t.auditLog.entityType, "lead")))
    .orderBy(desc(t.auditLog.id))
    .all();
  for (const row of rows) {
    const leadId = Number(row.entityId);
    if (!Number.isInteger(leadId) || !row.afterJson) continue;
    let record: NotifyRecord;
    try {
      record = JSON.parse(row.afterJson) as NotifyRecord;
    } catch {
      continue;
    }
    const audience = record.audience === "customer" ? "customer" : "trainer";
    const existing = byLead.get(leadId) ?? {};
    if (existing[audience]) continue; // newest already recorded
    byLead.set(leadId, { ...existing, [audience]: record });
  }

  // Newest receipt per message SID, applied to whichever send it belongs to.
  const receipts = new Map<string, NotifyRecord>();
  for (const row of getDb()
    .select()
    .from(t.auditLog)
    .where(and(eq(t.auditLog.action, "whatsapp_status_check"), eq(t.auditLog.entityType, "lead")))
    .orderBy(desc(t.auditLog.id))
    .all()) {
    if (!row.afterJson) continue;
    try {
      const check = JSON.parse(row.afterJson) as NotifyRecord;
      if (check.sid && !receipts.has(check.sid)) receipts.set(check.sid, check);
    } catch {
      continue;
    }
  }
  if (receipts.size) {
    for (const [leadId, audiences] of byLead) {
      const merged = { ...audiences };
      for (const audience of ["trainer", "customer"] as const) {
        const note = merged[audience];
        const receipt = note?.sid ? receipts.get(note.sid) : undefined;
        if (note && receipt?.status) {
          merged[audience] = {
            ...note,
            status: receipt.status,
            errorCode: receipt.errorCode ?? note.errorCode,
            error: receipt.error ?? note.error,
          };
        }
      }
      byLead.set(leadId, merged);
    }
  }
  return byLead;
}

function whatsappHref(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export default async function LeadsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    status?: string;
    sort?: string;
    waLead?: string;
    waStatus?: string;
    waCode?: string;
    waMessage?: string;
  }>;
}) {
  const {
    q = "",
    tab = "upcoming",
    status = "",
    sort = "newest",
    waLead = "",
    waStatus = "",
    waCode = "",
    waMessage = "",
  } = await searchParams;
  const trainer = await getTrainer();
  // Calendly never notifies us, so re-read any booking whose slot we are missing
  // or have not checked recently, then load the healed rows.
  await syncStaleCalendlyEvents(getDb().select().from(t.leads).all());
  const allLeads = getDb().select().from(t.leads).orderBy(desc(t.leads.id)).all();
  const notifications = loadNotifications();
  const query = q.trim().toLowerCase();

  // One clock for the whole render, so every row agrees on "30 minutes ago".
  // Safe here: this page is force-dynamic, so it renders once per request on the
  // server and never re-renders on the client.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const progressFor = new Map(allLeads.map((l) => [l.id, bookingProgress(l, now)]));

  // Search and the contacted filter narrow everything, including the tab counts,
  // so a filtered view can't advertise bookings it isn't going to show.
  const matching = allLeads.filter((l) => {
    if (status && l.status !== status) return false;
    if (!query) return true;
    return [l.id, l.name, l.whatsapp, l.email, l.goal, l.level, l.message, l.stage, l.status]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(query));
  });

  const leadsIn = (key: BookingTabKey) =>
    matching.filter((l) => inBookingTab(key, l, progressFor.get(l.id)!, now));

  const href = (key: string) => {
    const params = new URLSearchParams();
    if (key !== "upcoming") params.set("tab", key);
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/admin/leads?${qs}` : "/admin/leads";
  };

  const TAB_LABELS: { key: BookingTabKey; label: string; urgent?: boolean }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "needs", label: "Needs you", urgent: true },
    { key: "unpaid", label: "Never paid" },
    { key: "notime", label: "No time picked" },
    { key: "closed", label: "Closed" },
    { key: "all", label: "All" },
  ];
  const tabs: BookingTab[] = TAB_LABELS.map((t) => ({
    ...t,
    count: leadsIn(t.key).length,
    href: href(t.key),
  }));

  const activeTab: BookingTabKey = TAB_LABELS.find((t) => t.key === tab)?.key ?? "upcoming";
  const leads = leadsIn(activeTab).sort((a, b) => {
    if (sort === "oldest") return a.id - b.id;
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "stage") return a.stage.localeCompare(b.stage) || b.id - a.id;
    if (sort === "status") return a.status.localeCompare(b.status) || b.id - a.id;
    return b.id - a.id;
  });

  /**
   * Everything each row needs, derived once. The phone cards and the desktop
   * table both render from this, so the follow-up wording can never drift
   * between the two layouts.
   */
  const rows = leads.map((lead) => {
    const progress = progressFor.get(lead.id)!;
    const followupText =
      lead.stage === "paid"
        ? `Hi ${lead.name}, your ${trainer.brand} consultation payment is received. Please pick your slot, or reply here and I'll help you schedule it. Booking ID: #${lead.id}`
        : `Hi ${lead.name}, I noticed you started booking a ${trainer.brand} consultation. Do you need help completing payment or choosing a slot? Booking ID: #${lead.id}`;
    return {
      lead,
      progress,
      notify: notifications.get(lead.id),
      whatsappText: progress.needsFollowup
        ? followupText
        : `Hi ${lead.name}, this is regarding your ${trainer.brand} consultation booking #${lead.id}.`,
    };
  });

  const emptyMessage =
    allLeads.length === 0
      ? "No bookings yet."
      : query || status
        ? "Nothing here matches your search."
        : (EMPTY_TAB[activeTab] ?? "Nothing here.");

  /** Keeps active filters visible while the panel is collapsed on a phone. */
  const filterSummary =
    [q && `“${q}”`, status && FOLLOWUP_LABEL[status], sort !== "newest" && "custom order"]
      .filter(Boolean)
      .join(" · ") || undefined;

  return (
    <>
      <AdminHeading title="Bookings" />

      <PushToggle className="mb-4" />

      {waLead && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            waStatus === "delivered" || waStatus === "read"
              ? "border-ok/40 bg-ok/10 text-ok"
              : waStatus === "failed" || waStatus === "undelivered"
                ? "border-bad/40 bg-bad/10 text-bad"
                : "border-line bg-ink-card text-muted"
          }`}
        >
          <p>
            Booking #{waLead} WhatsApp delivery status: <strong>{waStatus || "unknown"}</strong>
            {waCode ? ` (error ${waCode})` : ""}.
          </p>
          {waMessage && <p className="mt-1">{waMessage}</p>}
        </div>
      )}

      <AdminListControls
        resetHref="/admin/leads"
        collapseOnMobile
        summary={filterSummary}
      >
        {/* Applying a filter must not throw you back to the first tab. */}
        <input type="hidden" name="tab" value={activeTab} />
        <Field label="Search">
          <Input name="q" defaultValue={q} placeholder="Name, phone, email, goal…" />
        </Field>
        <Field label="Have you contacted them" tooltip="Your own follow-up, not the customer's progress.">
          <Select name="status" defaultValue={status}>
            <option value="">Everyone</option>
            <option value="new">Not contacted</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field label="Sort">
          <Select name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
            <option value="stage">How far they got</option>
            <option value="status">Contacted or not</option>
          </Select>
        </Field>
      </AdminListControls>

      <BookingTabs tabs={tabs} active={activeTab} />

      {/* Cards on a phone, the table from md up. Both render the same rows —
          derived once here so the two layouts can never disagree. */}
      <ul className="rounded-b-2xl border border-t-0 border-line bg-ink-card md:hidden">
        {rows.map(({ lead: l, progress, whatsappText, notify }) => (
          <BookingCard
            key={l.id}
            lead={l}
            progress={progress}
            followupLabel={FOLLOWUP_LABEL[l.status] ?? l.status}
            notify={notify}
            now={now}
          >
            <BookingDetails booking={l} notify={notify} />
            <LeadWhatsAppButton
              leadId={l.id}
              href={whatsappHref(l.whatsapp, whatsappText)}
              highlight={progress.needsFollowup}
            />
            {l.status !== "closed" && (
              <form action={setLeadStatusAction.bind(null, l.id, "closed")}>
                <button className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent">
                  Close
                </button>
              </form>
            )}
          </BookingCard>
        ))}
        {leads.length === 0 && <li className="p-8 text-center text-sm text-muted">{emptyMessage}</li>}
      </ul>

      <AdminTable
        flush
        className="hidden md:block"
        headers={["Who", "How far they got", "What to do", "Call time", "Came in", ""]}
      >
        {rows.map(({ lead: l, progress, whatsappText, notify }) => {
          return (
          <tr key={l.id} className={progress.needsFollowup ? "bg-warn/5" : undefined}>
            <td className="px-4 py-3">
              <span className="font-semibold">{l.name}</span>
              <a
                href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-accent hover:underline"
              >
                {l.whatsapp}
              </a>
              {l.email && <span className="block text-xs text-muted">{l.email}</span>}
              <span className="mt-1 block text-xs text-muted/70">
                Booking #{l.id}
                {l.goal ? ` · ${l.goal}` : ""}
                {l.level ? ` · ${l.level}` : ""}
              </span>
            </td>
            <td className="px-4 py-3">
              <BookingStageSummary progress={progress} />
            </td>
            <td className="px-4 py-3">
              <p className={`text-xs ${progress.tone === "warn" ? "text-warn" : "text-muted"}`}>
                {progress.headline}
              </p>
              <span className="mt-1 inline-block">
                <StatusPill
                  value={l.status}
                  label={
                    l.status === "contacted" && l.contactedAt
                      ? `Messaged ${ageLabel(l.contactedAt, now)}`
                      : (FOLLOWUP_LABEL[l.status] ?? l.status)
                  }
                />
              </span>
            </td>
            <td className="px-4 py-3 text-xs text-muted">
              {l.calendlyStatus === "canceled" ? (
                <span className="block font-semibold text-bad">Cancelled</span>
              ) : l.scheduledAt ? (
                <span className="block font-semibold text-fg">{dateTime(l.scheduledAt)}</span>
              ) : (
                <span className="block">Not picked</span>
              )}
              {(["trainer", "customer"] as const).map((audience) => {
                const note = notify?.[audience];
                if (!note) return null;
                // Never claim receipt we cannot evidence — Twilio accepting a
                // message is not WhatsApp delivering it.
                const delivery = whatsAppDelivery(note);
                return (
                  <span key={audience} className={`mt-0.5 block ${TONE_CLASS[delivery.tone]}`}>
                    {audience === "trainer" ? "Yours" : "Theirs"}: {delivery.text}
                  </span>
                );
              })}
            </td>
            <td className="px-4 py-3 text-xs text-muted">
              {dateTime(l.createdAt)}
              <span className="block">{ageLabel(l.createdAt, now)}</span>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <BookingDetails booking={l} notify={notify} />
                {/* Opening the chat records the contact — no separate button. */}
                <LeadWhatsAppButton
                  leadId={l.id}
                  href={whatsappHref(l.whatsapp, whatsappText)}
                  highlight={progress.needsFollowup}
                />
                {l.status !== "closed" && (
                  <form action={setLeadStatusAction.bind(null, l.id, "closed")}>
                    <button className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent">
                      Close
                    </button>
                  </form>
                )}
              </div>
            </td>
          </tr>
          );
        })}
        {leads.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-muted">
              {emptyMessage}
            </td>
          </tr>
        )}
      </AdminTable>
    </>
  );
}
