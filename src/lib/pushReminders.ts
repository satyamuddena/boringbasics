import "server-only";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { getDb, schema as t } from "@/db";
import { audit } from "@/lib/audit";
import { sendAdminPush } from "@/lib/push";
import { callReminderNotification } from "@/lib/pushTemplate";
import { dueReminders } from "@/lib/reminderCore";

export interface ReminderRunResult {
  checked: number;
  due: number;
  sent: number;
  skipped?: string;
}

/**
 * Sends the pre-call reminder for every booking that is due one.
 *
 * Safe to call from anywhere, as often as you like. The marker is written
 * *before* the send, so two runners racing — the in-process ticker and a cron
 * hit landing together — cannot both claim the same booking. A send that then
 * fails is not retried, which is the right trade for a time-boxed reminder: a
 * retry a minute later is nearly worthless, and a duplicate buzz is worse than
 * a missed one.
 */
export async function sendDueReminders(now = Date.now()): Promise<ReminderRunResult> {
  const db = getDb();
  const settings = db.select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get();

  if (!settings?.pushOnReminder) {
    return { checked: 0, due: 0, sent: 0, skipped: "Call reminders are switched off." };
  }

  // Only rows that could possibly qualify: confirmed, timed, not yet reminded.
  const candidates = db
    .select({
      id: t.leads.id,
      name: t.leads.name,
      scheduledAt: t.leads.scheduledAt,
      reminderSentAt: t.leads.reminderSentAt,
      stage: t.leads.stage,
    })
    .from(t.leads)
    .where(
      and(
        eq(t.leads.stage, "booked"),
        isNotNull(t.leads.scheduledAt),
        isNull(t.leads.reminderSentAt),
      ),
    )
    .all();

  const due = dueReminders(candidates, now, settings.pushReminderMinutes);
  let sent = 0;

  for (const booking of due) {
    // Claim it first. The conditional update is the lock: if another runner got
    // here in between, it matches zero rows and this one moves on.
    const claimed = db
      .update(t.leads)
      .set({ reminderSentAt: new Date(now).toISOString() })
      .where(and(eq(t.leads.id, booking.id), isNull(t.leads.reminderSentAt)))
      .run();
    if (claimed.changes === 0) continue;

    const result = await sendAdminPush(
      callReminderNotification(booking, settings.pushReminderMinutes),
      { kind: "reminder" },
    );
    if (result.ok) sent += 1;

    audit({
      actor: "system",
      action: "push_notify",
      entityType: "lead",
      entityId: String(booking.id),
      after: {
        kind: "call_reminder",
        minutesBefore: settings.pushReminderMinutes,
        ok: result.ok,
        sent: result.sent,
        failed: result.failed,
        pruned: result.pruned,
        skipped: result.skipped,
        error: result.error,
      },
    });
  }

  return { checked: candidates.length, due: due.length, sent };
}
