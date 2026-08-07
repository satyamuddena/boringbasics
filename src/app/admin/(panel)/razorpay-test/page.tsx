import { AdminAlert, AdminCard, AdminHeading, SubmitButton } from "@/components/admin/ui";
import { DiagnosticsConfig, DiagnosticsTabs } from "@/components/admin/DiagnosticsTabs";
import { createTestOrderAction } from "./actions";
import { razorpayDiagnostics } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export default async function RazorpayTestPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; orderId?: string; error?: string; message?: string }>;
}) {
  const { created, orderId, error, message } = await searchParams;
  const diag = razorpayDiagnostics();
  const configured = diag.ready;

  return (
    <>
      <AdminHeading title="Diagnostics" />

      <div className="max-w-3xl">
        {!configured && (
          <AdminAlert tone="warn">
            Razorpay is not configured, so no order can be created — see Configuration below.
          </AdminAlert>
        )}

        {created && (
          <AdminAlert tone="ok">
            <p>Razorpay accepted the request and successfully created a test order.</p>
            {orderId && (
              <p className="mt-1">
                <strong>Order ID:</strong> {orderId}
              </p>
            )}
          </AdminAlert>
        )}

        {error === "unconfigured" && (
          <AdminAlert tone="bad">Cannot test: Razorpay is not configured.</AdminAlert>
        )}

        {error === "send" && (
          <AdminAlert tone="bad">
            Razorpay could not create the order. {message || "Check the server logs and API keys."}
          </AdminAlert>
        )}

        <DiagnosticsTabs active="razorpay" />

        <AdminCard flush title="Create test order">
          <form action={createTestOrderAction} className="space-y-4">
            <div className="rounded-xl border border-line bg-ink p-4 font-mono text-sm leading-6 text-muted">
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-fg">
                Order Details
              </p>
              <p className="mt-2">
                Amount: ₹1.00 (100 paise)
                <br />
                Currency: INR
                <br />
                Notes: test=true
              </p>
            </div>
            <p className="text-xs text-muted/70">
              This will ping the Razorpay API to create an order. No actual payment will be
              captured. It verifies that your keys are correct and the server can reach Razorpay.
            </p>
            <SubmitButton disabled={!configured}>Create test order</SubmitButton>
          </form>
        </AdminCard>

        <DiagnosticsConfig
          vars={[
            {
              name: "RAZORPAY_KEY_ID",
              set: diag.keyIdSet,
              note: "Public half of the API key. Also sent to the browser to open checkout.",
            },
            {
              name: "RAZORPAY_KEY_SECRET",
              set: diag.keySecretSet,
              note: "Authenticates order creation and verifies the webhook signature.",
            },
          ]}
        />
      </div>
    </>
  );
}
