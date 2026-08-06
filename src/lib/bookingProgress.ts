/**
 * One source of truth for "where is this booking, and what do I do about it".
 *
 * The leads table tracks two separate things and it is easy to confuse them:
 *   stage  — how far the customer got: details → paid → booked
 *   status — whether the trainer has followed up: new → contacted → closed
 *
 * Everything a trainer needs to read is derived here so the table row and the
 * details dialog can never describe the same booking differently. Pure — no db,
 * no server-only imports — so both the server page and the client dialog use it.
 */

import { formatDateTime, formatDateTimeLong } from "@/lib/datetime";

export type StepState = "done" | "now" | "todo";
export type Tone = "ok" | "warn" | "info";

export interface ProgressStep {
  key: "details" | "paid" | "booked" | "done";
  /** Plain words a trainer can read at a glance. */
  label: string;
  state: StepState;
  /** When it happened, or why it hasn't. */
  note: string;
}

export interface BookingProgress {
  steps: ProgressStep[];
  tone: Tone;
  /** What is true right now, in one short sentence. */
  headline: string;
  /** What the trainer should do about it. */
  hint: string;
  /** Drives the highlighted row in the table and the follow-up filter. */
  needsFollowup: boolean;
}

/** The lead fields this module reads — a subset of the leads table. */
export interface BookingLike {
  stage: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  bookedAt: string | null;
  scheduledAt: string | null;
  amountPaise: number | null;
  currency: string | null;
  /** What Calendly last said: "active", "canceled", or "unverified". */
  calendlyStatus?: string | null;
  /** When the trainer last messaged them. */
  contactedAt?: string | null;
}

/** A lead that filled the form but never paid is chased after this long. */
export const STALE_DETAILS_MINUTES = 30;

/** After messaging someone, wait this long before nagging the trainer again. */
export const CHASE_AGAIN_AFTER_MINUTES = 24 * 60;

/** Re-exported so booking screens have one import for everything they render. */
export const dateTime = formatDateTime;
export const fullDateTime = formatDateTimeLong;

export function money(paise: number | null, currency: string | null) {
  if (!paise) return "";
  return `${currency === "INR" ? "₹" : `${currency ?? ""} `}${(paise / 100).toLocaleString("en-IN")}`;
}

export function minutesSince(value: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
}

export function ageLabel(value: string, now = Date.now()) {
  const mins = minutesSince(value, now);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** The tab groupings on the bookings list. "needs" and "all" overlap the rest. */
export type BookingTabKey = "upcoming" | "needs" | "unpaid" | "notime" | "closed" | "all";

/**
 * Which tab a booking belongs under. Kept beside the progress rules so a tab can
 * never disagree with the sentence shown inside it.
 */
export function inBookingTab(
  tab: BookingTabKey,
  lead: BookingLike,
  progress: BookingProgress,
  now = Date.now(),
): boolean {
  switch (tab) {
    case "needs":
      return progress.needsFollowup;
    case "upcoming": {
      if (lead.stage !== "booked" || lead.calendlyStatus === "canceled" || !lead.scheduledAt) {
        return false;
      }
      const at = new Date(lead.scheduledAt).getTime();
      return !Number.isNaN(at) && at >= now;
    }
    case "unpaid":
      return lead.stage === "details";
    case "notime":
      return lead.stage === "paid";
    case "closed":
      return lead.status === "closed";
    default:
      return true;
  }
}

/**
 * `now` is injected so the server page and the client dialog can agree, and so
 * the tests are not clock-dependent.
 */
export function bookingProgress(lead: BookingLike, now = Date.now()): BookingProgress {
  const paid = lead.stage === "paid" || lead.stage === "booked";
  const scheduled = lead.scheduledAt ? new Date(lead.scheduledAt).getTime() : null;
  const cancelled = lead.calendlyStatus === "canceled";
  const unconfirmed = lead.calendlyStatus === "unverified";
  const hasSlot = scheduled != null && !Number.isNaN(scheduled) && !cancelled;
  const callPassed = hasSlot && scheduled < now;
  const waitingToPay = !paid && minutesSince(lead.createdAt, now) < STALE_DETAILS_MINUTES;
  // The clock only tells us the slot has gone by, never whether anyone turned
  // up. Closing the booking is the trainer saying it actually happened, so only
  // that combination completes the step.
  const callConfirmed = callPassed && lead.status === "closed";

  // A lead we messaged an hour ago is not the same job as one we have never
  // touched. Recently chased drops out of the "waiting on me" list until the
  // ball is genuinely back in our court.
  const chasedMinsAgo = lead.contactedAt ? minutesSince(lead.contactedAt, now) : null;
  const justChased = chasedMinsAgo != null && chasedMinsAgo < CHASE_AGAIN_AFTER_MINUTES;
  const chasedAgo = lead.contactedAt ? ageLabel(lead.contactedAt, now) : "";

  const amount = money(lead.amountPaise, lead.currency);
  const steps: ProgressStep[] = [
    {
      key: "details",
      label: "Filled form",
      state: "done",
      note: dateTime(lead.createdAt),
    },
    {
      key: "paid",
      label: paid && amount ? `Paid ${amount}` : "Paid",
      state: paid ? "done" : waitingToPay ? "now" : "todo",
      note: paid ? dateTime(lead.paidAt) : waitingToPay ? "waiting" : "never paid",
    },
    {
      key: "booked",
      label: cancelled ? "Cancelled" : "Picked a time",
      state: hasSlot ? "done" : paid ? "now" : "todo",
      note: cancelled
        ? "they cancelled"
        : hasSlot
          ? dateTime(lead.scheduledAt)
          : lead.stage === "booked"
            ? "time missing"
            : "no time yet",
    },
    {
      key: "done",
      label: callConfirmed ? "Call done" : callPassed ? "Call time passed" : "Call done",
      state: callConfirmed ? "done" : callPassed ? "now" : "todo",
      note: callConfirmed
        ? "you marked it done"
        : callPassed
          ? "did it happen?"
          : "not yet",
    },
  ];

  // The first step that is not finished decides the message, unless the trainer
  // has already closed the lead.
  const message = (): Pick<BookingProgress, "tone" | "headline" | "hint" | "needsFollowup"> => {
    if (lead.status === "closed") {
      if (callConfirmed) {
        return {
          tone: "ok",
          headline: "Call done",
          hint: `The call was on ${dateTime(lead.scheduledAt)} and you closed this booking.`,
          needsFollowup: false,
        };
      }
      return {
        tone: "info",
        headline: "This booking is closed",
        hint: "You marked it done. Nothing to chase.",
        needsFollowup: false,
      };
    }
    if (!paid) {
      if (waitingToPay) {
        return {
          tone: "info",
          headline: "They just filled the form",
          hint: "Give them a few minutes to pay before you chase it.",
          needsFollowup: false,
        };
      }
      return {
        tone: justChased ? "info" : "warn",
        headline: "They filled the form but never paid",
        hint: chasedAgo
          ? justChased
            ? `You messaged them ${chasedAgo}. Give them a little time to reply.`
            : `You messaged them ${chasedAgo} and they still have not paid. Worth another nudge.`
          : "Send a WhatsApp and ask if they got stuck paying.",
        needsFollowup: !justChased,
      };
    }
    if (cancelled) {
      return {
        tone: "warn",
        headline: "They cancelled the call",
        hint: "They cancelled in Calendly. Message them and offer another time.",
        needsFollowup: true,
      };
    }
    if (!hasSlot) {
      if (lead.stage === "booked") {
        return {
          tone: "warn",
          headline: "They picked a time, but we can't read it",
          hint: "Hit Refresh to ask Calendly again. If it keeps failing, check CALENDLY_ACCESS_TOKEN.",
          needsFollowup: true,
        };
      }
      return {
        tone: justChased ? "info" : "warn",
        headline: "They paid but have not picked a time",
        hint: chasedAgo
          ? justChased
            ? `You messaged them ${chasedAgo}. Give them a little time to pick one.`
            : `You messaged them ${chasedAgo} and they still have not picked a time. Worth another nudge.`
          : "Message them and help them pick a time.",
        needsFollowup: !justChased,
      };
    }
    if (callPassed) {
      return {
        tone: "info",
        headline: `The call time passed on ${dateTime(lead.scheduledAt)}`,
        hint: "We can't tell if they turned up. Close this booking if it happened, or chase a no-show.",
        needsFollowup: true,
      };
    }
    return {
      tone: unconfirmed ? "info" : "ok",
      headline: `Call is on ${dateTime(lead.scheduledAt)}`,
      hint: unconfirmed
        ? "We could not reach Calendly to confirm this. Hit Refresh to check again."
        : "Nothing to do. They have paid and picked a time.",
      needsFollowup: false,
    };
  };

  return { steps, ...message() };
}

/**
 * Orders the Upcoming tab by the clock — soonest call first.
 *
 * The list answers "who am I speaking to next", so a 1:30 pm call belongs above
 * a 2:00 pm one even when the later call was booked more recently. Rows without
 * a usable time sink to the bottom rather than jumping the queue on a NaN
 * comparison, and ties fall back to the booking id so the order is stable.
 */
export function byCallTime(
  a: { id: number; scheduledAt?: string | null },
  b: { id: number; scheduledAt?: string | null },
): number {
  const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : NaN;
  const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : NaN;
  const aBad = Number.isNaN(at);
  const bBad = Number.isNaN(bt);
  if (aBad && bBad) return b.id - a.id;
  if (aBad) return 1;
  if (bBad) return -1;
  return at - bt || b.id - a.id;
}
