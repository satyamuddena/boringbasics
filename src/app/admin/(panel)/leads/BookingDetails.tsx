"use client";

import { useCallback, useEffect, useState } from "react";
import { BookingNextStep, BookingProgressBar } from "@/components/admin/BookingProgressBar";
import { btnGhost } from "@/components/admin/ui";
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
}: {
  booking: BookingDetail;
  notify?: Partial<Record<"trainer" | "customer", NotifyRecord>>;
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
        className={`${btnGhost} px-2 py-1 text-xs`}
      >
        View
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
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-2xl rounded-2xl border border-line bg-ink-card shadow-glow"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky so Close stays reachable however long the record is. */}
              <div className="sticky top-0 z-10 rounded-t-2xl border-b border-line/60 bg-ink-card px-5 pb-3 pt-5 sm:px-7">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink-card text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>

                <h2 className="pr-10 font-display text-2xl uppercase">{booking.name}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Booking #{booking.id} ·{" "}
                  {booking.contactedAt && booking.status !== "closed"
                    ? `You messaged them ${ageLabel(booking.contactedAt)}`
                    : (FOLLOWUP_LABEL[booking.status] ?? booking.status)}
                </p>
              </div>

              <div className="px-5 pb-6 pt-4 sm:px-7">
                <BookingProgressBar progress={progress} />

                <div className="mt-3">
                  <BookingNextStep progress={progress} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <LeadWhatsAppButton
                    leadId={booking.id}
                    href={`https://wa.me/${booking.whatsapp.replace(/\D/g, "")}`}
                    label={`Message ${firstName}`}
                    highlight
                  />
                  {/* For a call or an email — WhatsApp records itself. */}
                  {booking.status !== "closed" && (
                    <form action={setLeadStatusAction.bind(null, booking.id, "contacted")}>
                      <button className={`${btnGhost} px-3 py-1.5 text-sm`}>
                        I called or emailed them
                      </button>
                    </form>
                  )}
                  {booking.status !== "closed" && (
                    <form action={setLeadStatusAction.bind(null, booking.id, "closed")}>
                      <button className={`${btnGhost} px-3 py-1.5 text-sm`}>
                        Close this booking
                      </button>
                    </form>
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
