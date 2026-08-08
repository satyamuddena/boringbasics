"use client";

import { useCallback, useEffect, useState } from "react";
import { BookingNextStep, BookingProgressBar } from "@/components/admin/BookingProgressBar";
import { btnGhost, focusRing } from "@/components/admin/ui";
import { ageLabel, bookingProgress, fullDateTime, money } from "@/lib/bookingProgress";
import { whatsAppDelivery } from "@/lib/whatsappDelivery";
import {
  checkBookingWhatsAppAction,
  refreshCalendlySlotAction,
  setLeadStatusAction,
} from "./actions";
import { LeadWhatsAppButton } from "./LeadWhatsAppButton";

export interface NotifyRecord {
  audience?: "trainer" | "customer";
  recipient?: string;
  ok?: boolean;
  sid?: string;
  status?: string;
  errorCode?: number;
  error?: string;
}

export interface BookingDetail {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
  goal: string | null;
  level: string | null;
  message: string | null;
  stage: string;
  status: string;
  contactedAt: string | null;
  amountPaise: number | null;
  currency: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  bookedAt: string | null;
  scheduledAt: string | null;
  calendlyEventUri: string | null;
  calendlyStatus: string | null;
  calendlyCheckedAt: string | null;
  createdAt: string;
}

/** Plain words for the trainer's own follow-up state. */
const FOLLOWUP_LABEL: Record<string, string> = {
  new: "You have not contacted them",
  contacted: "You have contacted them",
  closed: "Closed",
};

const TONE_CLASS = { ok: "text-ok", warn: "text-warn", bad: "text-bad" } as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-fg">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line/60 pt-3">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted/70">{title}</h3>
      {children}
    </section>
  );
}

function NotifyLine({
  audience,
  customerName,
  note,
  leadId,
}: {
  audience: "trainer" | "customer";
  customerName: string;
  note?: NotifyRecord;
  leadId: number;
}) {
  const label = audience === "trainer" ? "To you" : `To ${customerName.split(" ")[0]}`;
  if (!note) {
    return (
      <div className="flex items-baseline justify-between gap-3 py-1.5">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-sm text-muted">Not sent</span>
      </div>
    );
  }
  const delivery = whatsAppDelivery(note);
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="min-w-0 text-right">
        <span className={`text-sm ${TONE_CLASS[delivery.tone]}`}>{delivery.text}</span>
        {note.ok === false && !note.errorCode && note.error && (
          <span className="block text-xs text-muted">{note.error}</span>
        )}
        {/* Twilio only says "queued" on send, so the receipt has to be asked for. */}
        {note.ok !== false && !delivery.confirmed && note.sid && (
          <form action={checkBookingWhatsAppAction.bind(null, note.sid, leadId)}>
            <button className="mt-0.5 text-xs text-muted underline transition-colors hover:text-accent">
              Check if it arrived
            </button>
          </form>
        )}
      </span>
    </div>
  );
}

/** Full record for one booking — the table only has room for a summary. */
export function BookingDetails({
  booking,
  notify,
  stretched = false,
}: {
  booking: BookingDetail;
  notify?: Partial<Record<"trainer" | "customer", NotifyRecord>>;
  /**
   * Renders the trigger as an invisible overlay covering its nearest
   * `position: relative` ancestor instead of a small button, so the whole
   * booking card opens this sheet. Used on the mobile card only — the
   * desktop table keeps the small "View" button. The dialog itself is a
   * `fixed inset-0` overlay, so it renders identically either way; only the
   * trigger's own box changes.
   */
  stretched?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Computed on open, so there is no server/client clock mismatch to hydrate.
  const progress = open ? bookingProgress(booking) : null;
  const firstName = booking.name.split(" ")[0];
  const amount = money(booking.amountPaise, booking.currency);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={stretched ? `View booking #${booking.id} for ${booking.name}` : undefined}
        className={stretched ? `absolute inset-0 z-[1] ${focusRing}` : `${btnGhost} px-2 py-1 text-xs`}
      >
        {stretched ? null : "View"}
      </button>

      {open && progress && (
        // The scroll container and the centring must be separate elements.
        // `items-center` on a scrolling flex box puts the overflowing top of a
        // tall panel above the scrollable area, where it can never be reached.
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-ink/70 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`Booking #${booking.id}`}
        >
          {/*
            Bottom sheet on phones (items-end, top-rounded, flush to the
            screen edges — the gesture a phone user already expects),
            centered dialog from `sm:` up (items-center, rounded all round,
            capped width). Same two elements as before; only the alignment
            and the card's own rounding/width change per breakpoint.
          */}
          <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
            <div
              className="relative w-full rounded-t-2xl border border-line bg-ink-card shadow-glow sm:max-w-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle — a phone-only affordance, purely visual. */}
              <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />

              {/* Sticky so Close stays reachable however long the record is. */}
              <div className="sticky top-0 z-10 rounded-t-2xl border-b border-line/60 bg-ink-card px-5 pb-3 pt-3 sm:pt-5 sm:px-7">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-4 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink-card text-muted transition-colors hover:border-accent hover:text-accent sm:top-4"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>

                <h2 className="pr-12 font-display text-2xl uppercase">{booking.name}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Booking #{booking.id} ·{" "}
                  {booking.contactedAt && booking.status !== "closed"
                    ? `You messaged them ${ageLabel(booking.contactedAt)}`
                    : (FOLLOWUP_LABEL[booking.status] ?? booking.status)}
                </p>
              </div>

              <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-7 sm:pb-6">
                <BookingProgressBar progress={progress} />

                <div className="mt-3">
                  <BookingNextStep progress={progress} />
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <LeadWhatsAppButton
                    leadId={booking.id}
                    href={`https://wa.me/${booking.whatsapp.replace(/\D/g, "")}`}
                    label={`Message ${firstName}`}
                    size="full"
                  />
                  {/* For a call or an email — WhatsApp records itself. */}
                  {booking.status !== "closed" && (
                    <div className="flex gap-2">
                      <form
                        action={setLeadStatusAction.bind(null, booking.id, "contacted")}
                        className="flex-1"
                      >
                        <button
                          className={`${btnGhost} flex h-11 w-full items-center justify-center px-3 text-sm font-semibold`}
                        >
                          I called or emailed them
                        </button>
                      </form>
                      <form
                        action={setLeadStatusAction.bind(null, booking.id, "closed")}
                        className="flex-1"
                      >
                        <button
                          className={`${btnGhost} flex h-11 w-full items-center justify-center px-3 text-sm font-semibold`}
                        >
                          Close this booking
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  <Section title="Contact">
                    <dl>
                      <Row label="WhatsApp">
                        <a
                          href={`https://wa.me/${booking.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {booking.whatsapp}
                        </a>
                      </Row>
                      <Row label="Email">
                        {booking.email ? (
                          <a href={`mailto:${booking.email}`} className="text-accent hover:underline">
                            {booking.email}
                          </a>
                        ) : (
                          "Not given"
                        )}
                      </Row>
                      <Row label="Wants">
                        {booking.goal ?? "Not given"}
                        {booking.level ? ` · ${booking.level}` : ""}
                      </Row>
                    </dl>
                  </Section>

                  {booking.message && (
                    <Section title={`What ${firstName} wrote`}>
                      <p className="whitespace-pre-wrap text-sm text-fg">{booking.message}</p>
                    </Section>
                  )}

                  <Section title="Consultation">
                    <dl>
                      <Row label="Call time">
                        {booking.calendlyStatus === "canceled" ? (
                          <span className="text-bad">
                            Cancelled
                            {booking.scheduledAt && (
                              <span className="block text-xs text-muted line-through">
                                {fullDateTime(booking.scheduledAt)}
                              </span>
                            )}
                          </span>
                        ) : booking.scheduledAt ? (
                          <>
                            <span className="font-semibold">{fullDateTime(booking.scheduledAt)}</span>
                            {booking.calendlyStatus === "unverified" && (
                              <span className="block text-xs text-warn">
                                Not confirmed with Calendly
                              </span>
                            )}
                          </>
                        ) : (
                          "Not picked yet"
                        )}
                      </Row>
                      <Row label="Paid">
                        {amount ? `${amount} on ${fullDateTime(booking.paidAt)}` : "Not paid"}
                      </Row>
                      {booking.calendlyEventUri && (
                        <Row label="Checked">
                          <span className="text-muted">
                            {booking.calendlyCheckedAt
                              ? `Calendly last asked ${fullDateTime(booking.calendlyCheckedAt)}`
                              : "Never asked Calendly"}
                          </span>
                          <form action={refreshCalendlySlotAction.bind(null, booking.id)}>
                            <button className={`${btnGhost} mt-1 px-2 py-1 text-xs`}>
                              Refresh from Calendly
                            </button>
                          </form>
                        </Row>
                      )}
                    </dl>
                  </Section>

                  <Section title="Confirmation messages we sent">
                    <NotifyLine audience="trainer" customerName={booking.name} note={notify?.trainer} leadId={booking.id} />
                    <NotifyLine audience="customer" customerName={booking.name} note={notify?.customer} leadId={booking.id} />
                  </Section>

                  <details className="border-t border-line/60 pt-3">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted/70">
                      Payment and technical details
                    </summary>
                    <dl className="mt-1">
                      <Row label="Payment ID">{booking.razorpayPaymentId ?? "—"}</Row>
                      <Row label="Order ID">{booking.razorpayOrderId ?? "—"}</Row>
                      <Row label="Calendly">
                        {booking.calendlyEventUri ? (
                          <a
                            href={booking.calendlyEventUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-accent hover:underline"
                          >
                            Open the event
                          </a>
                        ) : (
                          "No event"
                        )}
                      </Row>
                      <Row label="Booked on">{fullDateTime(booking.bookedAt)}</Row>
                      <Row label="Form filled">{fullDateTime(booking.createdAt)}</Row>
                      <Row label="Raw stage">
                        {booking.stage} / {booking.status}
                      </Row>
                    </dl>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
