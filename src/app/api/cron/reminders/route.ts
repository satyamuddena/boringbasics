import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/pushReminders";

export const dynamic = "force-dynamic";

/**
 * The pre-call reminder sweep, as an endpoint.
 *
 * The in-process ticker in `instrumentation.ts` already runs this every minute,
 * so nothing needs to call it — this exists so the sweep can be driven by a real
 * cron if the app is ever run as more than one container, and so it can be
 * triggered by hand while testing without waiting for the next tick.
 *
 * Guarded by CRON_SECRET. When that is unset the route is disabled outright
 * rather than left open: an unauthenticated endpoint that sends notifications is
 * a doorbell anyone can ring.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set, so this endpoint is disabled." },
      { status: 404 },
    );
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueReminders();
  return NextResponse.json({ ok: true, ...result });
}
