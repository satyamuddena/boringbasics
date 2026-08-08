"use client";

import { btnGhost } from "@/components/admin/ui";
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

/**
 * Touch sizing for the mobile card/sheet. `table` is untouched — it is the
 * original dense chip used in the desktop table row, which stays mouse-sized
 * on purpose. `compact` is a 44px target for a card that shares its action row
 * with Close; `full` is the 48–52px primary treatment for the one card/sheet
 * that most needs a reply.
 */
const SIZE_CLASS = {
  table: `${btnGhost} px-2 py-1 text-xs`,
  compact: `${btnGhost} flex h-11 flex-1 items-center justify-center px-3 text-sm font-semibold`,
  full: "flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-ink shadow-[0_10px_26px_-10px_rgba(255,90,10,0.6)] transition-colors hover:bg-accent-deep",
} as const;

const TABLE_HIGHLIGHT_CLASS =
  "rounded-lg border border-accent px-2 py-1 text-xs text-accent transition-colors hover:bg-accent hover:text-ink";

export function LeadWhatsAppButton({
  leadId,
  href,
  label = "WhatsApp",
  highlight = false,
  size = "table",
}: {
  leadId: number;
  href: string;
  label?: string;
  /** Only meaningful at `size="table"` — the compact/full sizes always carry their own weight. */
  highlight?: boolean;
  size?: keyof typeof SIZE_CLASS;
}) {
  const className = size === "table" && highlight ? TABLE_HIGHLIGHT_CLASS : SIZE_CLASS[size];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void markContactedAction(leadId).catch(() => {});
      }}
      className={className}
    >
      {size === "full" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.35 5.07L2 22l5.07-1.32A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm0 18a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-3 .78.8-2.93-.19-.3A7.95 7.95 0 1 1 12 20Zm4.34-5.96c-.24-.12-1.4-.69-1.62-.77-.22-.08-.37-.12-.53.12-.16.24-.6.77-.74.92-.14.16-.27.18-.5.06-.24-.12-1-.37-1.9-1.17-.7-.63-1.18-1.4-1.31-1.64-.14-.24-.01-.37.1-.49.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.76-.19-.46-.39-.4-.53-.4h-.45c-.16 0-.42.06-.63.3-.22.24-.83.81-.83 1.98 0 1.16.85 2.29.97 2.45.12.16 1.66 2.54 4.03 3.56.56.24 1 .39 1.34.5.56.18 1.08.15 1.48.09.45-.07 1.4-.57 1.6-1.13.2-.55.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28Z" />
        </svg>
      )}
      {label}
    </a>
  );
}
