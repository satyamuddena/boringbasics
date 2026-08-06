/**
 * Runs once when the server starts (Next calls `register` before the first
 * request), and is where the pre-call reminder ticker lives.
 *
 * A reminder is the one notification that is not caused by a request, so
 * something has to watch the clock. This app runs as a single always-on
 * container, so an in-process interval is the honest fit: no external
 * scheduler to configure, nothing extra to forget when redeploying. The same
 * work is exposed at /api/cron/reminders for anyone who would rather drive it
 * from a real cron — both paths call the same function, and the claim-then-send
 * marker in the database makes running both at once harmless.
 *
 * What this deliberately does not do is guarantee delivery while the container
 * is down. If the server is asleep at the moment a reminder is due, that
 * reminder is skipped rather than fired late for a call already in progress.
 */

const TICK_MS = 60_000;

export async function register() {
  // `register` also runs in the edge runtime, which has neither a database nor
  // long-lived timers. Node only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Dev recompiles re-run this; without the guard every edit adds a timer.
  const g = globalThis as typeof globalThis & { __bbReminderTimer?: NodeJS.Timeout };
  if (g.__bbReminderTimer) return;

  const { sendDueReminders } = await import("@/lib/pushReminders");

  const tick = async () => {
    try {
      const result = await sendDueReminders();
      if (result.sent > 0) {
        console.info(`[reminders] sent ${result.sent} of ${result.due} due`);
      }
    } catch (error) {
      // A scheduler that dies on one bad tick is worse than no scheduler.
      console.error("[reminders] tick failed:", (error as Error)?.message);
    }
  };

  g.__bbReminderTimer = setInterval(tick, TICK_MS);
  // Never hold the process open on this alone.
  g.__bbReminderTimer.unref?.();
  console.info(`[reminders] watching for calls every ${TICK_MS / 1000}s`);
}
