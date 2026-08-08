import { StatusPill } from "@/components/admin/ui";
import { BookingStageSummary } from "@/components/admin/BookingProgressBar";
import { ageLabel, dateTime, type BookingProgress } from "@/lib/bookingProgress";
import { whatsAppDelivery } from "@/lib/whatsappDelivery";
import type { NotifyRecord } from "@/app/admin/(panel)/leads/BookingDetails";

/**
 * The phone-sized presentation of one booking.
 *
 * A six-column table is unreadable at 375px, so small screens get this instead
 * while the desktop table is left exactly as it was. Everything shown here is
 * derived by the same `bookingProgress()` the table uses and rendered by the
 * same shared components — this is a second layout, not a second set of rules.
 */

const TONE_CLASS = { ok: "text-ok", warn: "text-warn", bad: "text-bad" } as const;

interface CardLead {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
  goal: string | null;
  level: string | null;
  status: string;
  contactedAt: string | null;
  scheduledAt: string | null;
  calendlyStatus: string | null;
  createdAt: string;
}

export function BookingCard({
  lead,
  progress,
  followupLabel,
  notify,
  now,
  children,
}: {
  lead: CardLead;
  progress: BookingProgress;
  /** Plain words for the trainer's own follow-up state. */
  followupLabel: string;
  notify?: { trainer?: NotifyRecord; customer?: NotifyRecord };
  now: number;
  /** The action buttons — passed in so the card owns no behaviour. */
  children: React.ReactNode;
}) {
  return (
    // `relative` makes this the containing block for BookingDetails' stretched
    // trigger below — the whole card opens the detail sheet, not just a small
    // "View" chip. Anything that must stay independently tappable (the wa.me
    // link, the action row) gets its own `relative z-[2]` to sit above it; see
    // the comment on that trigger for how the stacking is kept predictable.
    <li
      className={`relative border-b border-line p-4 transition-colors last:border-b-0 active:bg-ink-soft/60 ${
        progress.needsFollowup ? "bg-warn/5" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate font-semibold">{lead.name}</p>
            <span aria-hidden className="shrink-0 text-muted">
              &rsaquo;
            </span>
          </div>
          <a
            href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-[2] block text-xs text-accent hover:underline"
          >
            {lead.whatsapp}
          </a>
          {lead.email && <span className="block truncate text-xs text-muted">{lead.email}</span>}
        </div>
        <StatusPill
          value={lead.status}
          label={
            lead.status === "contacted" && lead.contactedAt
              ? `Messaged ${ageLabel(lead.contactedAt, now)}`
              : followupLabel
          }
        />
      </div>

      <div className="mt-3">
        <BookingStageSummary progress={progress} />
      </div>

      {/* The hint, not the headline: BookingStageSummary already prints the
          headline when the tone is ok, and printing it again read as a stutter
          ("Call done / Call done") on a narrow screen. */}
      <p className={`mt-2 text-xs ${progress.tone === "warn" ? "text-warn" : "text-muted"}`}>
        {progress.hint}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">Call time</dt>
        <dd className="text-right">
          {lead.calendlyStatus === "canceled" ? (
            <span className="font-semibold text-bad">Cancelled</span>
          ) : lead.scheduledAt ? (
            <span className="font-semibold text-fg">{dateTime(lead.scheduledAt)}</span>
          ) : (
            <span className="text-muted">Not picked</span>
          )}
        </dd>
        <dt className="text-muted">Came in</dt>
        <dd className="text-right text-muted">{ageLabel(lead.createdAt, now)}</dd>
      </dl>

      {(["trainer", "customer"] as const).map((audience) => {
        const note = notify?.[audience];
        if (!note) return null;
        // Same rule as the table: Twilio accepting a message is not WhatsApp
        // delivering it, so never claim a receipt we cannot evidence.
        const delivery = whatsAppDelivery(note);
        return (
          <p key={audience} className={`mt-1 text-xs ${TONE_CLASS[delivery.tone]}`}>
            {audience === "trainer" ? "Yours" : "Theirs"}: {delivery.text}
          </p>
        );
      })}

      <p className="mt-2 text-xs text-muted">
        Booking #{lead.id}
        {lead.goal ? ` · ${lead.goal}` : ""}
        {lead.level ? ` · ${lead.level}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </li>
  );
}
