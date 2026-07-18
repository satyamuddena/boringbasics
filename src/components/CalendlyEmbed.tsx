"use client";

import { useEffect } from "react";
import Script from "next/script";

/** Payload Calendly posts to the parent window when a slot is scheduled. */
interface ScheduledPayload {
  event?: { uri?: string };
  invitee?: { uri?: string };
}

/**
 * Inline Calendly scheduler. Calendly's widget.js auto-initialises any element
 * with the `calendly-inline-widget` class using its `data-url`. Renders nothing
 * without a url. `prefill` fills the invitee's name/email; `onScheduled` fires
 * when the client completes a booking.
 */
export function CalendlyEmbed({
  url,
  prefill,
  onScheduled,
}: {
  url?: string;
  prefill?: { name?: string; email?: string };
  onScheduled?: (payload: ScheduledPayload) => void;
}) {
  useEffect(() => {
    const cb = onScheduled;
    if (!cb) return;
    function handle(e: MessageEvent) {
      if (e.origin !== "https://calendly.com") return;
      if (
        typeof e.data === "object" &&
        e.data !== null &&
        (e.data as { event?: string }).event === "calendly.event_scheduled"
      ) {
        cb!((e.data as { payload?: ScheduledPayload }).payload ?? {});
      }
    }
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [onScheduled]);

  if (!url) return null;

  // Merge prefill params into the data-url without clobbering existing ones.
  const dataUrl = (() => {
    try {
      const u = new URL(url);
      if (prefill?.name) u.searchParams.set("name", prefill.name);
      if (prefill?.email) u.searchParams.set("email", prefill.email);
      return u.toString();
    } catch {
      return url;
    }
  })();

  return (
    <>
      <div
        className="calendly-inline-widget overflow-hidden rounded-2xl border border-line bg-white"
        data-url={dataUrl}
        style={{ minWidth: "320px", height: "700px" }}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />
    </>
  );
}
