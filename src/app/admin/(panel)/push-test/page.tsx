import { AdminCard, AdminHeading, Field, Select, SubmitButton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema as t } from "@/db";
import { pushDiagnostics, pushService, type PushDeviceOutcome } from "@/lib/push";
import {
  bookingConfirmedNotification,
  paymentReceivedNotification,
  testNotification,
} from "@/lib/pushTemplate";
import { deviceLabel } from "@/lib/deviceLabel";
import { ageLabel } from "@/lib/bookingProgress";
import { sendPushTestAction } from "./actions";

export const dynamic = "force-dynamic";

const SAMPLE = {
  id: 1234,
  name: "John Doe",
  whatsapp: "+91XXXXXXXXXX",
  email: "john@email.com",
  amount: 149900,
  scheduledAt: "2026-07-20T18:00:00+05:30",
};

const KIND_LABEL: Record<string, string> = {
  test: "Test notification",
  payment: "Payment received",
  booking: "Booking confirmed",
};

interface SentResult {
  ok: boolean;
  sent: number;
  failed: number;
  pruned: number;
  skipped?: string;
  error?: string;
  devices: PushDeviceOutcome[];
}

function parseResult(raw: string | undefined): SentResult | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SentResult;
  } catch {
    return null;
  }
}

export default async function PushTestPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; kind?: string; audience?: string; result?: string }>;
}) {
  const { kind = "test", audience = "self", result: rawResult } = await searchParams;
  const admin = await requireAdmin();
  const diag = pushDiagnostics();
  const result = parseResult(rawResult);

  const db = getDb();
  const devices = db.select().from(t.pushSubscriptions).all();
  const mine = devices.filter((d) => d.userId === admin.id);

  const previews = [
    { key: "test", note: "What the Send test button sends.", body: testNotification() },
    {
      key: "payment",
      note: "Fires when Razorpay confirms a payment.",
      body: paymentReceivedNotification(SAMPLE),
    },
    {
      key: "booking",
      note: "Fires when Calendly confirms a time.",
      body: bookingConfirmedNotification(SAMPLE),
    },
  ];

  return (
    <>
      <AdminHeading title="Notification Test" />

      {/* Configuration — the first thing to check when nothing arrives. */}
      <div
        className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
          diag.ready ? "border-ok/40 bg-ok/10 text-ok" : "border-bad/40 bg-bad/10 text-bad"
        }`}
      >
        <p className="font-semibold">
          {diag.ready ? "Push is configured" : "Push is not configured"}
        </p>
        <ul className="mt-2 space-y-0.5 text-xs">
          <li>VAPID_PUBLIC_KEY: {diag.publicKeySet ? "set" : "missing"}</li>
          <li>VAPID_PRIVATE_KEY: {diag.privateKeySet ? "set" : "missing"}</li>
          <li>
            Subject: <code>{diag.subject}</code> (from {diag.subjectSource})
          </li>
        </ul>
        {diag.problem && <p className="mt-2 text-xs">{diag.problem}</p>}
        {!diag.ready && (
          <p className="mt-2 text-xs">
            Generate a pair on your own machine with{" "}
            <code>npx web-push generate-vapid-keys</code>, set the variables in Coolify, and
            redeploy. They are runtime variables — no rebuild needed.
          </p>
        )}
      </div>

      {/* Outcome of the last send, per device. */}
      {result && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            result.ok
              ? "border-ok/40 bg-ok/10 text-ok"
              : "border-bad/40 bg-bad/10 text-bad"
          }`}
        >
          <p className="font-semibold">
            {KIND_LABEL[kind] ?? "Notification"} —{" "}
            {result.skipped
              ? "nothing was sent"
              : `${result.sent} sent, ${result.failed} failed, ${result.pruned} removed`}
          </p>
          {result.skipped && <p className="mt-1 text-xs">{result.skipped}</p>}
          {result.error && !result.skipped && <p className="mt-1 text-xs">{result.error}</p>}
          {result.devices.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {result.devices.map((d) => (
                <li key={d.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{deviceLabel(d.device)}</span>
                  <span className="text-muted">via {d.service}</span>
                  <span>
                    {d.outcome}
                    {d.statusCode ? ` (${d.statusCode})` : ""}
                  </span>
                  {d.error && <span className="w-full text-muted">{d.error}</span>}
                </li>
              ))}
            </ul>
          )}
          {result.sent > 0 && (
            <p className="mt-2 text-xs">
              Accepted by the push service. If nothing appeared on the phone, the app was
              probably in the foreground, or notifications are muted in the OS.
            </p>
          )}
        </div>
      )}

      <AdminCard title="Send a dummy notification">
        <form action={sendPushTestAction} className="max-w-xl space-y-4">
          <Field
            label="Notification"
            hint="These are the exact builders the real booking triggers use — not a copy."
          >
            <Select name="kind" defaultValue={kind}>
              <option value="test">Test notification</option>
              <option value="payment">Payment received</option>
              <option value="booking">Booking confirmed</option>
            </Select>
          </Field>
          <Field
            label="Send to"
            hint="Every device buzzes real phones, including any belonging to someone else."
          >
            <Select name="audience" defaultValue={audience}>
              <option value="self">My devices ({mine.length})</option>
              <option value="all">Every registered device ({devices.length})</option>
            </Select>
          </Field>

          <div className="rounded-lg border border-line bg-ink p-4 text-sm leading-6">
            {previews.map((p) => (
              <div key={p.key} className="mb-4 last:mb-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg">
                  {KIND_LABEL[p.key]}
                </p>
                <p className="mt-1 font-semibold text-fg">{p.body.title}</p>
                <p className="text-muted">{p.body.body}</p>
                <p className="mt-0.5 text-xs text-muted/70">{p.note}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted/70">
            The sample booking deliberately carries a surname, a phone number, an email and an
            amount. None of them appear above: notifications render on a locked screen, so they
            are built from a first name and a time only.
          </p>

          <SubmitButton>Send notification</SubmitButton>
        </form>
      </AdminCard>

      <div className="mt-6">
        <AdminCard title="Registered devices">
          {devices.length === 0 ? (
            <p className="text-sm text-muted">
              No device has notifications turned on yet. Install the app on a phone, open
              Bookings, and press Turn on.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {devices.map((d) => (
                <li key={d.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{deviceLabel(d.userAgent)}</span>
                  {d.userId === admin.id && (
                    <span className="rounded-full border border-accent/40 px-2 text-[10px] uppercase text-accent">
                      you
                    </span>
                  )}
                  <span className="text-xs text-muted">
                    via {pushService(d.endpoint)} · added {ageLabel(d.createdAt)}
                    {d.failureCount ? ` · ${d.failureCount} recent failures` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <p className="mt-6 text-xs text-muted/70">
        iPhone only delivers to an app added to the Home Screen — never a Safari tab — and needs
        iOS 16.4 or newer. A device that stops responding is dropped automatically the first time
        the push service reports it gone.
      </p>
    </>
  );
}
