import Link from "next/link";

/**
 * Folder-style tabs across the top of the bookings list.
 *
 * Plain links over a `?tab=` param rather than client state, so the page stays
 * server-rendered, bookmarkable and back-button friendly like the rest of the
 * admin. The counts are the point — the workload is readable without clicking.
 */

export interface BookingTab {
  key: string;
  label: string;
  count: number;
  href: string;
  /** Draws the count in the warning colour — used for "Needs you". */
  urgent?: boolean;
}

export function BookingTabs({ tabs, active }: { tabs: BookingTab[]; active: string }) {
  return (
    <div className="flex gap-0.5 overflow-x-auto border-b border-line px-1">
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            // The active tab blends into the table header directly beneath it,
            // so the two read as one panel rather than two stacked boxes.
            className={`-mb-px flex-none whitespace-nowrap rounded-t-xl border px-4 py-2.5 text-sm transition-colors ${
              on
                ? "border-line border-b-ink-soft bg-ink-soft font-semibold text-fg"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                tab.urgent && tab.count > 0
                  ? "bg-warn/15 text-warn"
                  : on
                    ? "bg-ink text-muted"
                    : "bg-ink/60 text-muted/80"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
