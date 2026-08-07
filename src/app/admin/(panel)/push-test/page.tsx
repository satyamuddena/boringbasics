import { AdminAlert, AdminCard, AdminHeading, Field, Select, SubmitButton } from "@/components/admin/ui";
import { DiagnosticsConfig, DiagnosticsTabs } from "@/components/admin/DiagnosticsTabs";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema as t } from "@/db";
import { pushDiagnostics, pushService, type PushDeviceOutcome } from "@/lib/push";
import Image from "next/image";
import { eq } from "drizzle-orm";
import {
  bookingConfirmedNotification,
  callReminderNotification,
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
  reminder: "Call reminder",
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
  // Scheme only. web-push rejects anything that is not mailto: or https:, which
  // is the failure worth surfacing — the address behind it is a real mailbox
  // and has no business being printed on a page.
  const subjectScheme = diag.subject.startsWith("mailto:")
    ? "mailto:"
    : diag.subject.startsWith("https://")
      ? "https://"
      : "unusable scheme";

  const db = getDb();
  const devices = db.select().from(t.pushSubscriptions).all();
  const mine = devices.filter((d) => d.userId === admin.id);
  const minutes =
    db.select().from(t.siteSettings).where(eq(t.siteSettings.id, 1)).get()?.pushReminderMinutes ??
    10;

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
    {
      key: "reminder",
      note: `Fires ${minutes} minutes before a confirmed call.`,
      body: callReminderNotification(SAMPLE, minutes),
    },
  ];

  return (
    <>
      <AdminHeading title="Diagnostics" />

      <div className="max-w-3xl">
      {!diag.ready && (
        <AdminAlert tone="warn">
          Push is not configured, so nothing can be sent — see Configuration below.
        </AdminAlert>
      )}

      {/* Outcome of the last send, per device. */}
      {result && (
        <AdminAlert tone={result.ok ? "ok" : "bad"}>
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
        </AdminAlert>
      )}

      <DiagnosticsTabs active="push" />

      <AdminCard flush title="Send a dummy notification">
        <form action={sendPushTestAction} className="space-y-4">
          <Field
            label="Notification"
            hint="These are the exact builders the real booking triggers use — not a copy."
          >
            <Select name="kind" defaultValue={kind}>
              <option value="test">Test notification</option>
              <option value="payment">Payment received</option>
              <option value="booking">Booking confirmed</option>
              <option value="reminder">Call reminder</option>
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

          {/* Laid out like a lock-screen row — artwork, then title and body —
              because the per-kind icon is the thing that makes a reminder
              distinguishable from a booking at a glance, and it is exactly what
              a text-only preview cannot show you. */}
          <div className="rounded-xl border border-line bg-ink p-4 text-sm leading-6">
            {previews.map((p) => (
              <div key={p.key} className="mb-4 flex gap-3 last:mb-0">
                <Image
                  src={p.body.icon}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-lg border border-line object-contain"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg">
                    <Image
                      src={p.body.badge}
                      alt=""
                      width={14}
                      height={14}
                      // The monochrome silhouette Android puts in the status bar.
                      className="h-3.5 w-3.5 shrink-0 object-contain opacity-70"
                    />
                    {KIND_LABEL[p.key]}
                  </p>
                  <p className="mt-1 font-semibold text-fg">{p.body.title}</p>
                  <p className="text-muted">{p.body.body}</p>
                  <p className="mt-0.5 text-xs text-muted/70">{p.note}</p>
                </div>
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

      <AdminCard title="Registered devices" className="mt-6">
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

      <DiagnosticsConfig
        problem={diag.problem}
        vars={[
          {
            name: "VAPID_PUBLIC_KEY",
            set: diag.publicKeySet,
            note: "Identifies this server to the push service.",
          },
          {
            name: "VAPID_PRIVATE_KEY",
            set: diag.privateKeySet,
            note: "Signs each push. Generate the pair with npx web-push generate-vapid-keys.",
          },
          {
            name: "VAPID_SUBJECT",
            set: diag.subjectSource === "VAPID_SUBJECT",
            optional: true,
            // The address itself is a real mailbox, so only the scheme and the
            // source are reported — those are what actually go wrong.
            note: `Contact URI for the push service — ${subjectScheme}, from ${diag.subjectSource}. Falls back to ADMIN_EMAIL.`,
          },
        ]}
      >
        <p className="mt-4 text-xs text-muted/70">
          iPhone only delivers to an app added to the Home Screen — never a Safari tab — and
          needs iOS 16.4 or newer. A device that stops responding is dropped automatically the
          first time the push service reports it gone.
        </p>
      </DiagnosticsConfig>
      </div>
    </>
  );
}
