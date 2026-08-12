import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema as t } from "@/db";
import { recordsToCsv } from "@/lib/analyticsExport";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  const rows = getDb().select().from(t.leads).orderBy(desc(t.leads.id)).all();
  const columns: Array<keyof (typeof rows)[number]> = [
    "id",
    "name",
    "whatsapp",
    "email",
    "goal",
    "level",
    "preferredDatetime",
    "message",
    "status",
    "contactedAt",
    "stage",
    "amountPaise",
    "currency",
    "razorpayOrderId",
    "razorpayPaymentId",
    "paidAt",
    "bookedAt",
    "calendlyEventUri",
    "calendlyStatus",
    "calendlyCheckedAt",
    "scheduledAt",
    "reminderSentAt",
    "createdAt",
  ];
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(recordsToCsv(rows, columns), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=boring-basics-bookings-raw-${today}.csv`,
      "Cache-Control": "private, no-store",
    },
  });
}
