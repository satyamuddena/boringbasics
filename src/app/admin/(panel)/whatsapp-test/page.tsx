import { AdminAlert, AdminCard, AdminHeading, Field, Input, Select, SubmitButton } from "@/components/admin/ui";
import { DiagnosticsConfig, DiagnosticsTabs } from "@/components/admin/DiagnosticsTabs";
import { getConsultation, getTrainer } from "@/lib/content";
import { twilioDiagnostics } from "@/lib/whatsapp";
import { WHATSAPP_FIX } from "@/lib/whatsappDelivery";
import { checkWhatsAppStatusAction, sendWhatsAppTestAction } from "./actions";

export const dynamic = "force-dynamic";

const AUDIENCE_LABEL: Record<string, string> = {
  trainer: "Trainer alert",
  customer: "Customer confirmation",
};

export default async function WhatsAppTestPage({
  searchParams,
}: {
  searchParams: Promise<{
    sent?: string;
    checked?: string;
    sid?: string;
    status?: string;
    code?: string;
    message?: string;
    error?: string;
    audience?: string;
  }>;
}) {
  const { sent, checked, sid, status, code, message, error, audience } = await searchParams;
  const selected = audience === "customer" ? "customer" : "trainer";
  const delivered = status === "delivered" || status === "read";
  const failed = status === "failed" || status === "undelivered";
  const [trainer, consultation] = await Promise.all([getTrainer(), getConsultation()]);
  const diag = twilioDiagnostics();

  const recheckForm = (label: string) =>
    sid && (
      <form action={checkWhatsAppStatusAction} className="mt-3">
        <input type="hidden" name="sid" value={sid} />
        <input type="hidden" name="audience" value={selected} />
        <SubmitButton>{label}</SubmitButton>
      </form>
    );

  return (
    <>
      <AdminHeading title="Diagnostics" />

      <div className="max-w-3xl">
        {!diag.ready && (
          <AdminAlert tone="warn">
            Twilio is not configured, so nothing can be sent — see Configuration below.
          </AdminAlert>
        )}

        {sent && (
          <AdminAlert>
            <p>
              Twilio accepted the {AUDIENCE_LABEL[selected].toLowerCase()}
              {status ? ` with initial status “${status}”` : ""}. This is not yet delivery
              confirmation.
            </p>
            {recheckForm("Check delivery status")}
          </AdminAlert>
        )}

        {checked && (
          <AdminAlert tone={delivered ? "ok" : failed ? "bad" : "info"}>
            <p>
              Twilio delivery status: <strong>{status ?? "unknown"}</strong>
              {code ? ` (error ${code})` : ""}.
            </p>
            {message && <p className="mt-1">{message}</p>}
            {!delivered && !failed && recheckForm("Check again")}
          </AdminAlert>
        )}

        {error === "phone" && (
          <AdminAlert tone="bad">
            Enter a valid WhatsApp number with country code, for example +91XXXXXXXXXX.
          </AdminAlert>
        )}

        {error === "send" && (
          <AdminAlert tone="bad">
            Twilio could not submit the test. {message || "Check the server logs and Twilio setup."}
          </AdminAlert>
        )}

        {/*
          Guidance for the error that actually came back. This used to print the
          sandbox explanation for every failure, which is wrong for most codes
          and cost real time chasing an opt-in problem that did not exist.
        */}
        {(sent || checked || error === "send") &&
          (code && WHATSAPP_FIX[Number(code)] ? (
            <p className="mb-4 text-xs text-muted/70">
              <strong>Error {code}:</strong> {WHATSAPP_FIX[Number(code)]}
            </p>
          ) : (
            <p className="mb-4 text-xs text-muted/70">
              {code ? (
                <>
                  Error <strong>{code}</strong> is not one this page explains yet — look it up at{" "}
                  <code>twilio.com/docs/api/errors/{code}</code>.
                </>
              ) : (
                <>
                  A send that Twilio accepts is not yet a delivery — WhatsApp confirms separately,
                  so re-check the status before trusting it.
                </>
              )}
            </p>
          ))}

        {error === "status" && !checked && (
          <AdminAlert tone="bad">
            Could not check Twilio delivery status. {message}
          </AdminAlert>
        )}

        <DiagnosticsTabs active="whatsapp" />

        <AdminCard flush title="Send dummy booking notification">
          <form action={sendWhatsAppTestAction} className="space-y-4">
            <Field
              label="Message"
              hint="Both templates are sent on a real booking — test each one separately."
            >
              <Select name="audience" defaultValue={selected}>
                <option value="trainer">Trainer alert</option>
                <option value="customer">Customer confirmation</option>
              </Select>
            </Field>
            <Field
              label="Recipient WhatsApp number"
              hint="Use E.164 format, e.g. +91XXXXXXXXXX. On a production sender the recipient must have opted in; on the Sandbox they must join it first."
            >
              <Input name="recipient" type="tel" required placeholder="+91XXXXXXXXXX" />
            </Field>

            <div className="rounded-xl border border-line bg-ink p-4 font-mono text-sm leading-6 text-muted">
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-fg">
                Trainer alert — booking_confirmation_trainer
              </p>
              <p className="mt-2">
                New booking received.
                <br />
                <br />
                Name: John Doe
                <br />
                Phone: +91XXXXXXXXXX
                <br />
                Date: 20 July
                <br />
                Time: 6:00 PM
                <br />
                Email: john@email.com
                <br />
                <br />
                Please review this booking in the admin panel.
              </p>
              <p className="mt-5 font-sans text-xs font-semibold uppercase tracking-wider text-fg">
                Customer confirmation — booking_confirmation_customer_v2
              </p>
              <p className="mt-2">
                Hi John, your consultation with {trainer.brand} is confirmed. 🎉
                <br />
                <br />
                Date: 20 July
                <br />
                Time: 6:00 PM (IST)
                <br />
                Duration: {consultation.durationLabel}
                <br />
                <br />
                A calendar invite is on its way to your email. Please join a couple of minutes
                early — and if you need to reschedule, just reply to this message.
                <br />
                <br />
                Looking forward to speaking with you!
              </p>
            </div>

            <p className="text-xs text-muted/70">
              Previews show the approved Content Template bodies with sample values. Meta rejects
              any template whose body starts or ends with a variable — that is why the brand
              appears in the customer greeting rather than as a sign-off.
            </p>

            <SubmitButton>Send test WhatsApp</SubmitButton>
          </form>
        </AdminCard>

        <DiagnosticsConfig
          vars={[
            {
              name: "TWILIO_ACCOUNT_SID",
              set: diag.accountSidSet,
              note: "The Twilio account making the call.",
            },
            {
              name: "TWILIO_AUTH_TOKEN",
              set: diag.authTokenSet,
              note: "Authenticates that account.",
            },
            {
              name: "TWILIO_WHATSAPP_FROM",
              set: diag.fromSet,
              note: "The sending number. On the Sandbox, recipients must join it first.",
            },
            {
              name: "TWILIO_WHATSAPP_CONTENT_SID",
              set: diag.trainerTemplateSet,
              note: "Approved template for the trainer alert. Without it, that message alone fails.",
            },
            {
              name: "TWILIO_WHATSAPP_CUSTOMER_CONTENT_SID",
              set: diag.customerTemplateSet,
              note: "Approved template for the customer confirmation.",
            },
          ]}
        />
      </div>
    </>
  );
}
