import { AdminCard, AdminHeading, SubmitButton } from "@/components/admin/ui";
import { createTestOrderAction } from "./actions";
import { razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export default async function RazorpayTestPage({ searchParams }: { searchParams: Promise<{ created?: string; orderId?: string; error?: string; message?: string }> }) {
  const { created, orderId, error, message } = await searchParams;
  const configured = razorpayConfigured();

  return (
    <>
      <AdminHeading title="Razorpay Test" />
      
      {!configured && (
        <p className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2 text-sm text-warn">
          Razorpay keys are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment variables.
        </p>
      )}

      {created && (
        <div className="mb-4 rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
          <p>Razorpay accepted the request and successfully created a test order.</p>
          {orderId && (
            <p className="mt-1">
              <strong>Order ID:</strong> {orderId}
            </p>
          )}
        </div>
      )}

      {error === "unconfigured" && (
        <p className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">
          Cannot test: Razorpay is not configured.
        </p>
      )}

      {error === "send" && (
        <p className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm text-bad">
          Razorpay could not create the order. {message || "Check the server logs and API keys."}
        </p>
      )}

      <AdminCard title="Create test order">
        <form action={createTestOrderAction} className="max-w-xl space-y-4">
          <div className="rounded-lg border border-line bg-ink p-4 font-mono text-sm leading-6 text-muted">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-fg">Order Details</p>
            <p className="mt-2">
              Amount: ₹1.00 (100 paise)<br />
              Currency: INR<br />
              Notes: test=true
            </p>
          </div>
          <p className="text-xs text-muted/70">
            This will ping the Razorpay API to create an order. No actual payment will be captured. It verifies that your keys are correct and the server can reach Razorpay.
          </p>
          <SubmitButton disabled={!configured}>Create test order</SubmitButton>
        </form>
      </AdminCard>
    </>
  );
}
