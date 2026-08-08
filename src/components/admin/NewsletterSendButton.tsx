"use client";

import { useFormStatus } from "react-dom";
import { btnAccentOutline, btnPrimary } from "./ui";

export function NewsletterSendControls({ subscriberCount }: { subscriberCount: number }) {
  const { pending, data } = useFormStatus();
  const recipients = `${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"}`;
  const pendingIntent = pending ? String(data?.get("intent") ?? "") : "";
  const testRecipient = pending ? String(data?.get("testEmail") ?? "") : "";

  return (
    <div aria-busy={pending}>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="test"
          disabled={pending}
          className={`${btnAccentOutline} min-w-44`}
        >
          {pendingIntent === "test" && <Spinner />}
          {pendingIntent === "test" ? "Sending test…" : "Send test email"}
        </button>
        <button
          type="submit"
          name="intent"
          value="broadcast"
          disabled={pending || subscriberCount === 0}
          onClick={(event) => {
            if (!window.confirm(`Send this newsletter to all ${recipients}?`)) event.preventDefault();
          }}
          className={`${btnPrimary} min-w-44 gap-2`}
        >
          {pendingIntent === "broadcast" && <Spinner />}
          {pendingIntent === "broadcast" ? `Sending to ${recipients}…` : `Send to all ${recipients}`}
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={`mt-2 text-xs ${pending ? "text-accent" : "text-muted"}`}
      >
        {pendingIntent === "test"
          ? `Sending a test to ${testRecipient}. Keep this page open until the result appears.`
          : pendingIntent === "broadcast"
            ? "Broadcast delivery is in progress. Keep this page open until the result appears."
          : subscriberCount === 0
            ? "Test sending is available. Add an active subscriber before broadcasting."
            : "Send a test first, then broadcast the same newsletter when it looks right."}
      </p>
    </div>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/35 border-t-current" />;
}
