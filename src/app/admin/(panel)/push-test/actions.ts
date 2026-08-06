"use server";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { str } from "@/lib/forms";
import { sendAdminPush } from "@/lib/push";
import {
  bookingConfirmedNotification,
  paymentReceivedNotification,
  testNotification,
  type PushBookingInput,
} from "@/lib/pushTemplate";

/**
 * A booking that never existed, with every field the real notification is
 * allowed to draw on filled in. The point is to prove the redaction: if the
 * surname, phone, email or amount ever leaked into a lock screen, this sample
 * would show it.
 */
const SAMPLE: PushBookingInput = {
  id: 1234,
  name: "John Doe",
  whatsapp: "+91XXXXXXXXXX",
  email: "john@email.com",
  amount: 149900,
  scheduledAt: "2026-07-20T18:00:00+05:30",
};

export type PushTestKind = "test" | "payment" | "booking";

const build = (kind: PushTestKind) =>
  kind === "payment"
    ? paymentReceivedNotification(SAMPLE)
    : kind === "booking"
      ? bookingConfirmedNotification(SAMPLE)
      : testNotification();

export async function sendPushTestAction(formData: FormData) {
  const admin = await requireAdmin();
  const raw = str(formData, "kind");
  const kind: PushTestKind = raw === "payment" || raw === "booking" ? raw : "test";
  // "This device" is the useful default; sending to every admin device is
  // opt-in because it buzzes phones belonging to other people.
  const everyone = str(formData, "audience") === "all";

  const result = await sendAdminPush(build(kind), everyone ? {} : { userId: admin.id });

  audit({
    actor: admin.email,
    action: "push_test",
    entityType: "push",
    after: {
      kind,
      audience: everyone ? "all" : "self",
      ok: result.ok,
      sent: result.sent,
      failed: result.failed,
      pruned: result.pruned,
      skipped: result.skipped,
      error: result.error,
    },
    ...(await requestMeta()),
  });

  const params = new URLSearchParams({ sent: "1", kind, audience: everyone ? "all" : "self" });
  // The per-device breakdown is the whole point, and it is small — a summary
  // in the query string keeps the page a plain server component with no store.
  params.set(
    "result",
    JSON.stringify({
      ok: result.ok,
      sent: result.sent,
      failed: result.failed,
      pruned: result.pruned,
      skipped: result.skipped,
      error: result.error,
      devices: result.devices ?? [],
    }),
  );
  redirect(`/admin/push-test?${params}`);
}
