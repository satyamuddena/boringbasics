"use server";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin, requestMeta } from "@/lib/auth";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/razorpay";

export async function createTestOrderAction() {
  const admin = await requireAdmin();
  
  if (!razorpayConfigured()) {
    redirect("/admin/razorpay-test?error=unconfigured");
  }

  let orderId: string | undefined;
  let errorMsg: string | undefined;

  try {
    const order = await createRazorpayOrder({
      amountPaise: 100, // 1 INR
      currency: "INR",
      receipt: `test-receipt-${Date.now()}`,
      notes: { test: "true", admin: admin.email },
    });
    orderId = order.id;
    
    audit({ 
      actor: admin.email, 
      action: "razorpay_test", 
      entityType: "razorpay_order", 
      after: { orderId, ok: true }, 
      ...(await requestMeta()) 
    });
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Failed to create order";
    
    audit({ 
      actor: admin.email, 
      action: "razorpay_test", 
      entityType: "razorpay_order", 
      after: { error: errorMsg, ok: false }, 
      ...(await requestMeta()) 
    });
  }

  if (errorMsg) {
    redirect(`/admin/razorpay-test?error=send&message=${encodeURIComponent(errorMsg)}`);
  }

  const params = new URLSearchParams({ created: "1" });
  if (orderId) params.set("orderId", orderId);
  redirect(`/admin/razorpay-test?${params}`);
}
