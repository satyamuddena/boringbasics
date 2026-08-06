"use client";

import { markContactedAction } from "./actions";

/**
 * Opens the lead's WhatsApp chat and records that we contacted them.
 *
 * Named apart from the public site's `WhatsAppButton` (components/) on purpose —
 * that one is the floating chat bubble for visitors, this one acts on a lead.
 *
 * Deliberately a plain anchor rather than a form: the browser opens the new tab
 * from the real click, so nothing is swallowed by a popup blocker, and the
 * server action runs alongside it. If that action fails the chat still opens —
 * losing the timestamp is far cheaper than blocking the trainer.
 */
export function LeadWhatsAppButton({
  leadId,
  href,
  label = "WhatsApp",
  highlight = false,
}: {
  leadId: number;
  href: string;
  label?: string;
  highlight?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void markContactedAction(leadId).catch(() => {});
      }}
      className={
        highlight
          ? "rounded-lg border border-accent px-2 py-1 text-xs text-accent transition-colors hover:bg-accent hover:text-ink"
          : "rounded-lg border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      }
    >
      {label}
    </a>
  );
}
