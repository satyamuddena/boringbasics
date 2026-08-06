"use client";

import { useCallback, useEffect, useState } from "react";
import { checkBookingWhatsAppAction } from "./actions";

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
  amountPaise: number | null;
  currency: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  bookedAt: string | null;
  scheduledAt: string | null;
  calendlyEventUri: string | null;
  createdAt: string;
}

const IST = "Asia/Kolkata";

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  }).format(new Date(value));
}

function money(paise: number | null, currency: string | null) {
  if (!paise) return "—";
  return `${currency === "INR" ? "₹" : `${currency ?? ""} `}${(paise / 100).toLocaleString("en-IN")}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-line/60 py-2.5 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-fg">{children}</dd>
    </div>
  );
}

function NotifyLine({
  audience,
  note,
  leadId,
}: {
  audience: "trainer" | "customer";
  note?: NotifyRecord;
  leadId: number;
}) {
  const label = audience === "trainer" ? "Trainer" : "Customer";
  if (!note) return <p className="mb-2 text-muted last:mb-0">{label}: not sent</p>;
  return (
    <div className="mb-2 last:mb-0">
      <p className={note.ok ? "text-ok" : "text-bad"}>
        {label}: {note.ok ? "sent" : "failed"}
        {note.errorCode ? ` (Twilio ${note.errorCode})` : ""}
        {note.recipient ? ` → ${note.recipient}` : ""}
      </p>
      {!note.ok && note.error && <p className="text-xs text-muted">{note.error}</p>}
      {note.ok && note.sid && (
        <form action={checkBookingWhatsAppAction.bind(null, note.sid, leadId)} className="mt-1">
          <button className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent">
            Check delivery
          </button>
        </form>
      )}
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        View
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`Booking #${booking.id}`}
        >
          <div
            className="relative my-8 w-full max-w-2xl rounded-2xl border border-line bg-ink-card p-6 shadow-glow sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            <h2 className="pr-10 font-display text-2xl uppercase">
              {booking.name}
              <span className="ml-2 text-base text-muted">#{booking.id}</span>
            </h2>

            <dl className="mt-5">
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
                  "—"
                )}
              </Row>
              <Row label="Goal / Level">
                {booking.goal ?? "—"}
                {booking.level ? ` · ${booking.level}` : ""}
              </Row>
              <Row label="Message">
                <span className="whitespace-pre-wrap">{booking.message || "—"}</span>
              </Row>
              <Row label="Stage">{booking.stage}</Row>
              <Row label="Follow-up">{booking.status}</Row>
              <Row label="Consultation">
                {booking.scheduledAt ? (
                  <span className="font-semibold">{dateTime(booking.scheduledAt)} IST</span>
                ) : booking.stage === "booked" ? (
                  "Slot time unknown — CALENDLY_ACCESS_TOKEN may be unset"
                ) : (
                  "Not booked yet"
                )}
              </Row>
              <Row label="Amount">{money(booking.amountPaise, booking.currency)}</Row>
              <Row label="Payment">
                {booking.razorpayPaymentId ?? "—"}
                {booking.razorpayOrderId && (
                  <span className="block text-xs text-muted">Order {booking.razorpayOrderId}</span>
                )}
                {booking.paidAt && (
                  <span className="block text-xs text-muted">Paid {dateTime(booking.paidAt)}</span>
                )}
              </Row>
              <Row label="Calendly">
                {booking.calendlyEventUri ? (
                  <a
                    href={booking.calendlyEventUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-accent hover:underline"
                  >
                    View event
                  </a>
                ) : (
                  "—"
                )}
                {booking.bookedAt && (
                  <span className="block text-xs text-muted">Booked {dateTime(booking.bookedAt)}</span>
                )}
              </Row>
              <Row label="WhatsApp sent">
                <NotifyLine audience="trainer" note={notify?.trainer} leadId={booking.id} />
                <NotifyLine audience="customer" note={notify?.customer} leadId={booking.id} />
              </Row>
              <Row label="Received">{dateTime(booking.createdAt)}</Row>
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
