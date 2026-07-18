import { desc } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { AdminHeading, AdminListControls, AdminTable, Field, Input, Select, StatusPill } from "@/components/admin/ui";
import { setLeadStatusAction } from "./actions";
import { getTrainer } from "@/lib/content";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  details: "Details",
  paid: "Paid",
  booked: "Booked",
};

function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
}

function ageLabel(value: string) {
  const mins = minutesSince(value);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function whatsappHref(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export default async function LeadsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; status?: string; followup?: string; sort?: string }>;
}) {
  const { q = "", stage = "", status = "", followup = "", sort = "newest" } = await searchParams;
  const trainer = await getTrainer();
  const allLeads = getDb().select().from(t.leads).orderBy(desc(t.leads.id)).all();
  const query = q.trim().toLowerCase();

  // Funnel counts for the analytics cards.
  const count = (stage: string) => allLeads.filter((l) => l.stage === stage).length;
  const paid = count("paid");
  const booked = count("booked");
  const started = allLeads.length;
  const staleDetails = allLeads.filter((l) => l.stage === "details" && minutesSince(l.createdAt) >= 30).length;
  const paidPending = allLeads.filter((l) => l.stage === "paid").length;
  const conversion = started ? Math.round((booked / started) * 100) : 0;
  const leads = allLeads
    .filter((l) => {
      const needsDetailsFollowup = l.stage === "details" && minutesSince(l.createdAt) >= 30;
      const needsSlotFollowup = l.stage === "paid";
      if (stage && l.stage !== stage) return false;
      if (status && l.status !== status) return false;
      if (followup === "needs" && !needsDetailsFollowup && !needsSlotFollowup) return false;
      if (!query) return true;
      return [
        l.id,
        l.name,
        l.whatsapp,
        l.email,
        l.goal,
        l.level,
        l.message,
        l.stage,
        l.status,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "oldest") return a.id - b.id;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stage") return a.stage.localeCompare(b.stage) || b.id - a.id;
      if (sort === "status") return a.status.localeCompare(b.status) || b.id - a.id;
      return b.id - a.id;
    });
  const funnel = [
    { label: "Details captured", value: started },
    { label: "Paid", value: paid + booked },
    { label: "Booked", value: booked },
    { label: "Needs follow-up", value: staleDetails + paidPending },
  ];

  return (
    <>
      <AdminHeading title="Bookings" />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {funnel.map((f) => (
          <div key={f.label} className="rounded-2xl border border-line bg-ink-card p-5">
            <p className="font-display text-4xl text-accent">{f.value}</p>
            <p className="mt-1 text-sm text-muted">{f.label}</p>
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm text-muted">
        Booked / started: {conversion}%. Follow up on details-only leads older than 30 minutes
        and paid leads that have not picked a slot.
      </p>

      <AdminListControls resetHref="/admin/leads">
        <Field label="Search">
          <Input name="q" defaultValue={q} placeholder="Name, phone, email, goal…" />
        </Field>
        <Field label="Stage">
          <Select name="stage" defaultValue={stage}>
            <option value="">All stages</option>
            <option value="details">Details</option>
            <option value="paid">Paid</option>
            <option value="booked">Booked</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field label="Sort">
          <Select name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
            <option value="stage">Stage A-Z</option>
            <option value="status">Status A-Z</option>
          </Select>
        </Field>
        <Field label="Follow-up">
          <Select name="followup" defaultValue={followup}>
            <option value="">All bookings</option>
            <option value="needs">Needs follow-up only</option>
          </Select>
        </Field>
      </AdminListControls>

      <AdminTable headers={["Contact", "Goal / Level", "Message", "Stage", "Payment / booking", "Received", "Status", ""]}>
        {leads.map((l) => {
          const needsDetailsFollowup = l.stage === "details" && minutesSince(l.createdAt) >= 30;
          const needsSlotFollowup = l.stage === "paid";
          const followupText = needsSlotFollowup
            ? `Hi ${l.name}, your ${trainer.brand} consultation payment is received. Please pick your slot, or reply here and I'll help you schedule it. Booking ID: #${l.id}`
            : `Hi ${l.name}, I noticed you started booking a ${trainer.brand} consultation. Do you need help completing payment or choosing a slot? Booking ID: #${l.id}`;
          const whatsappText =
            needsDetailsFollowup || needsSlotFollowup
              ? followupText
              : `Hi ${l.name}, this is regarding your ${trainer.brand} consultation booking #${l.id}.`;

          return (
          <tr key={l.id} className={needsDetailsFollowup || needsSlotFollowup ? "bg-accent/5" : undefined}>
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
              <span className="mt-1 block text-xs text-muted/70">Booking #{l.id}</span>
            </td>
            <td className="px-4 py-3 text-muted">
              {l.goal ?? "—"}
              <span className="block text-xs">{l.level ?? ""}</span>
            </td>
            <td className="max-w-xs px-4 py-3 text-muted">
              <span className="line-clamp-2">{l.message ?? "—"}</span>
            </td>
            <td className="px-4 py-3">
              <StatusPill value={STAGE_LABEL[l.stage] ?? l.stage} />
              {needsDetailsFollowup && (
                <span className="mt-1 block text-xs text-warn">Abandoned after details</span>
              )}
              {needsSlotFollowup && (
                <span className="mt-1 block text-xs text-warn">Paid, slot pending</span>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-muted">
              {l.amountPaise ? (
                <span className="block">
                  {l.currency === "INR" ? "₹" : `${l.currency ?? ""} `}
                  {(l.amountPaise / 100).toLocaleString("en-IN")}
                </span>
              ) : (
                <span className="block">—</span>
              )}
              {l.razorpayPaymentId && <span className="block">Payment: {l.razorpayPaymentId}</span>}
              {l.calendlyEventUri && (
                <a
                  href={l.calendlyEventUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-accent hover:underline"
                >
                  Calendly event
                </a>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-muted">
              {new Date(l.createdAt).toLocaleString("en-IN")}
              <span className="block">{ageLabel(l.createdAt)}</span>
            </td>
            <td className="px-4 py-3">
              <StatusPill value={l.status} />
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <a
                  href={whatsappHref(l.whatsapp, whatsappText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    needsDetailsFollowup || needsSlotFollowup
                      ? "border-accent text-accent hover:bg-accent hover:text-ink"
                      : "border-line text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  WhatsApp
                </a>
                {l.status !== "contacted" && (
                  <form action={setLeadStatusAction.bind(null, l.id, "contacted")}>
                    <button className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent">
                      Contacted
                    </button>
                  </form>
                )}
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
            <td colSpan={8} className="px-4 py-8 text-center text-muted">
              No bookings yet.
            </td>
          </tr>
        )}
      </AdminTable>
    </>
  );
}
