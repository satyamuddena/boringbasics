import type { ReactNode } from "react";
import { AdminAlert, AdminCard, AdminTabs } from "./ui";

/**
 * The three integration test pages read as one tool, so they share a tab bar
 * and a single sidebar entry.
 *
 * The tabs link to the pages' original routes rather than collapsing them into
 * one `?tab=` page: each already owns its own server actions and search params,
 * and keeping the URLs means existing bookmarks and the audit log's links stay
 * valid.
 */

export const DIAGNOSTICS_TABS = [
  { key: "whatsapp", label: "WhatsApp", href: "/admin/whatsapp-test" },
  { key: "razorpay", label: "Razorpay", href: "/admin/razorpay-test" },
  { key: "push", label: "Notifications", href: "/admin/push-test" },
];

/** Every route the Diagnostics sidebar entry should stay lit for. */
export const DIAGNOSTICS_ROUTES = DIAGNOSTICS_TABS.map((t) => t.href);

export function DiagnosticsTabs({ active }: { active: "whatsapp" | "razorpay" | "push" }) {
  // `card`: an AdminCard sits directly beneath on all three pages.
  return <AdminTabs tabs={DIAGNOSTICS_TABS} active={active} surface="card" />;
}

export interface ConfigVar {
  name: string;
  set: boolean;
  /** What it is for. Never the value — these are credentials. */
  note: string;
  /** Has a working fallback, so "not set" is a choice rather than a fault. */
  optional?: boolean;
}

/**
 * The environment a tool needs, in the same place and shape on all three tabs:
 * under the button, after you have tried the thing and want to know why it did
 * not work.
 *
 * Set/missing only. Every one of these is a credential — an account token, a
 * signing secret, a VAPID private key — so the page reports presence and never
 * the value. Even the VAPID subject is reduced to its scheme, because the
 * address it carries is a real mailbox.
 */
export function DiagnosticsConfig({
  vars,
  problem,
  children,
}: {
  vars: ConfigVar[];
  /** A specific fault worth stating outright, e.g. an unusable VAPID subject. */
  problem?: string;
  children?: ReactNode;
}) {
  const missing = vars.filter((v) => !v.set && !v.optional).length;

  return (
    <AdminCard title="Configuration" className="mt-6">
      <p className="mb-4 text-sm text-muted">
        {missing === 0
          ? "Everything this tool needs is set."
          : `${missing} required variable${missing === 1 ? "" : "s"} still to set.`}{" "}
        These are read from the server environment at runtime — changing one needs a restart,
        not a rebuild.
      </p>

      <ul className="divide-y divide-line">
        {vars.map((v) => (
          <li key={v.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
            <span className="min-w-0">
              <code className="font-mono text-xs text-fg">{v.name}</code>
              <span className="block text-xs text-muted">{v.note}</span>
            </span>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                v.set
                  ? "border-ok/40 text-ok"
                  : v.optional
                    ? "border-line text-muted"
                    : "border-bad/40 text-bad"
              }`}
            >
              {v.set ? "set" : v.optional ? "using default" : "missing"}
            </span>
          </li>
        ))}
      </ul>

      {problem && (
        <AdminAlert tone="bad" className="mt-4">
          {problem}
        </AdminAlert>
      )}
      {children}
    </AdminCard>
  );
}
