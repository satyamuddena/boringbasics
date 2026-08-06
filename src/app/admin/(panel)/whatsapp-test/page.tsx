import { AdminCard, AdminHeading, Field, Input, Select, SubmitButton } from "@/components/admin/ui";
import { getConsultation, getTrainer } from "@/lib/content";
import { checkWhatsAppStatusAction, sendWhatsAppTestAction } from "./actions";
export const dynamic = "force-dynamic";

const AUDIENCE_LABEL: Record<string, string> = { trainer: "Trainer alert", customer: "Customer confirmation" };

export default async function WhatsAppTestPage({ searchParams }: { searchParams: Promise<{ sent?: string; checked?: string; sid?: string; status?: string; code?: string; message?: string; error?: string; audience?: string }> }) {
  const { sent, checked, sid, status, code, message, error, audience } = await searchParams;
  const selected = audience === "customer" ? "customer" : "trainer";
  const delivered = status === "delivered" || status === "read";
  const failed = status === "failed" || status === "undelivered";
  const [trainer, consultation] = await Promise.all([getTrainer(), getConsultation()]);
  return <><AdminHeading title="WhatsApp Test" />
    {sent && <div className="mb-4 rounded-lg border border-line bg-ink-card px-4 py-3 text-sm text-muted"><p>Twilio accepted the {AUDIENCE_LABEL[selected].toLowerCase()}{status ? ` with initial status “${status}”` : ""}. This is not yet delivery confirmation.</p>{sid && <form action={checkWhatsAppStatusAction} className="mt-3"><input type="hidden" name="sid" value={sid} /><input type="hidden" name="audience" value={selected} /><SubmitButton>Check delivery status</SubmitButton></form>}</div>}
    {checked && <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${delivered ? "border-ok/40 bg-ok/10 text-ok" : failed ? "border-bad/40 bg-bad/10 text-bad" : "border-line bg-ink-card text-muted"}`}><p>Twilio delivery status: <strong>{status ?? "unknown"}</strong>{code ? ` (error ${code})` : ""}.</p>{message && <p className="mt-1">{message}</p>}{!delivered && !failed && sid && <form action={checkWhatsAppStatusAction} className="mt-3"><input type="hidden" name="sid" value={sid} /><input type="hidden" name="audience" value={selected} /><SubmitButton>Check again</SubmitButton></form>}</div>}
    {error === "phone" && <p className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">Enter a valid WhatsApp number with country code, for example +91XXXXXXXXXX.</p>}
    {error === "send" && <p className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">Twilio could not submit the test. {message || "Check the server logs and Twilio setup."}</p>}
    {(sent || checked || error === "send") && <p className="mb-4 text-xs text-muted/70">Error <strong>63015</strong> means the sender is the Twilio Sandbox and this recipient has not joined it — they must send <code>join &lt;your-code&gt;</code> to the sandbox number, and re-join every 3 days. Customers will never have done this, so a registered WhatsApp sender is required before customer confirmations can work. Error <strong>63016</strong> usually means the Content Template is not approved yet.</p>}
    {error === "status" && !checked && <p className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">Could not check Twilio delivery status. {message}</p>}
    <AdminCard title="Send dummy booking notification"><form action={sendWhatsAppTestAction} className="max-w-xl space-y-4">
      <Field label="Message" hint="Both templates are sent on a real booking — test each one separately."><Select name="audience" defaultValue={selected}><option value="trainer">Trainer alert</option><option value="customer">Customer confirmation</option></Select></Field>
      <Field label="Recipient WhatsApp number" hint="Use E.164 format, e.g. +91XXXXXXXXXX. On a production sender the recipient must have opted in; on the Sandbox they must join it first."><Input name="recipient" type="tel" required placeholder="+91XXXXXXXXXX" /></Field>
      <div className="rounded-lg border border-line bg-ink p-4 font-mono text-sm leading-6 text-muted">
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-fg">Trainer alert — booking_confirmation_trainer</p>
        <p className="mt-2">New booking received.<br /><br />Name: John Doe<br />Phone: +91XXXXXXXXXX<br />Date: 20 July<br />Time: 6:00 PM<br />Email: john@email.com<br /><br />Please review this booking in the admin panel.</p>
        <p className="mt-5 font-sans text-xs font-semibold uppercase tracking-wider text-fg">Customer confirmation — booking_confirmation_customer_v2</p>
        <p className="mt-2">Hi John, your consultation with {trainer.brand} is confirmed. 🎉<br /><br />Date: 20 July<br />Time: 6:00 PM (IST)<br />Duration: {consultation.durationLabel}<br /><br />A calendar invite is on its way to your email. Please join a couple of minutes early — and if you need to reschedule, just reply to this message.<br /><br />Looking forward to speaking with you!</p>
      </div>
      <p className="text-xs text-muted/70">Previews show the approved Content Template bodies with sample values. Meta rejects any template whose body starts or ends with a variable — that is why the brand appears in the customer greeting rather than as a sign-off.</p>
      <SubmitButton>Send test WhatsApp</SubmitButton>
    </form></AdminCard></>;
}
