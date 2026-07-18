import { AdminCard, AdminHeading, Field, Input, SubmitButton } from "@/components/admin/ui";
import { sendWhatsAppTestAction } from "./actions";
export const dynamic = "force-dynamic";
export default async function WhatsAppTestPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return <><AdminHeading title="WhatsApp Test" />
    {sent && <p className="mb-4 rounded-lg border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">Test message submitted to Twilio.</p>}
    {error === "phone" && <p className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">Enter a valid WhatsApp number with country code, for example +919989535929.</p>}
    {error === "send" && <p className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">Twilio could not send the test. Check the server logs and Twilio setup.</p>}
    <AdminCard title="Send dummy booking notification"><form action={sendWhatsAppTestAction} className="max-w-xl space-y-4"><Field label="Recipient WhatsApp number" hint="Use E.164 format, e.g. +919989535929. Sandbox recipients must first join your Twilio Sandbox."><Input name="recipient" type="tel" required placeholder="+919989535929" /></Field><div className="rounded-lg border border-line bg-ink p-4 font-mono text-sm leading-6 text-muted"><p className="font-sans text-xs font-semibold uppercase tracking-wider text-fg">Dummy booking message</p><p className="mt-2">Name: John Doe<br />Phone: +91XXXXXXXXXX<br />Date: 20 July<br />Time: 6:00 PM<br />Email: john@email.com</p></div><p className="text-xs text-muted/70">The Twilio Content Template must use this same five-field body format; its configured header will appear above it.</p><SubmitButton>Send test WhatsApp</SubmitButton></form></AdminCard></>;
}
