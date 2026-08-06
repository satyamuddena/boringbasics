/**
 * Which confirmed calls are due a reminder right now.
 *
 * Pure, and separated from the sending for the same reason `sessionCore` is:
 * the interesting part is a time-window decision that is miserable to test
 * through a database and a push service.
 *
 * The rule is deliberately one-sided. A booking is due once the call is within
 * `leadMinutes`, and stays due until the call actually starts — so a runner that
 * fell behind still sends, a few minutes late, rather than staying silent. The
 * only case worth suppressing is a reminder for a call that has already begun,
 * which is noise rather than help. Sending exactly once is the job of the
 * `reminderSentAt` marker, not of this window.
 */

export interface RemindableBooking {
  id: number;
  scheduledAt?: string | null;
  reminderSentAt?: string | null;
  stage?: string | null;
}

/**
 * Bookings that should be reminded about at `now`, soonest call first.
 *
 * Qualifies when the booking is confirmed, has a parseable time still in the
 * future, has not already been reminded, and that time is within `leadMinutes`.
 */
export function dueReminders<T extends RemindableBooking>(
  bookings: T[],
  now: number,
  leadMinutes: number,
): T[] {
  const lead = leadMinutes * 60_000;

  return bookings
    .filter((b) => {
      if (b.reminderSentAt) return false;
      // Only a confirmed call has a time worth reminding about.
      if (b.stage && b.stage !== "booked") return false;
      if (!b.scheduledAt) return false;

      const at = new Date(b.scheduledAt).getTime();
      if (Number.isNaN(at)) return false;

      const untilCall = at - now;
      // Started or over: too late to be useful.
      if (untilCall <= 0) return false;
      return untilCall <= lead;
    })
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
}
