import { AdminTabs, type AdminTab } from "./ui";

/**
 * Folder-style tabs across the top of the bookings list.
 *
 * The generic tab bar now lives in `ui.tsx` as `AdminTabs` — this stays as the
 * bookings-flavoured name and type so the call site keeps reading in the
 * domain's own language.
 */

export type BookingTab = AdminTab & { count: number };

export function BookingTabs({ tabs, active }: { tabs: BookingTab[]; active: string }) {
  // `soft`: the table header directly beneath is bg-ink-soft, so the active tab
  // blends into it and the two read as one panel rather than two stacked boxes.
  return <AdminTabs tabs={tabs} active={active} surface="soft" />;
}
