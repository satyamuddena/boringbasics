"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconName } from "@/components/admin/NavIcon";
import { MOBILE_BAR_HEIGHT } from "@/lib/adminChrome";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  /**
   * Extra routes this entry owns. One sidebar entry can front several pages —
   * Diagnostics covers three — and without this it would only light up on the
   * one it links to.
   */
  match?: string[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

const STORAGE_KEY = "admin-nav-collapsed";
const CHANGE_EVENT = "admin-nav-collapsed-change";

/**
 * The collapsed flag lives in localStorage, which React treats as an external
 * store — reading it in an effect would cause a cascading render. Subscribing
 * also keeps multiple admin tabs in sync for free.
 */
const collapsedStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  },
  getSnapshot: () => window.localStorage.getItem(STORAGE_KEY) === "1",
  // The server can't know the preference; expanded matches the first paint.
  getServerSnapshot: () => false,
};

/** /admin/leads matches /admin/leads/12 but /admin must not match everything. */
function matchesRoute(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, item: NavItem) {
  return [item.href, ...(item.match ?? [])].some((href) => matchesRoute(pathname, href));
}

function NavLinks({
  sections,
  collapsed,
  onNavigate,
  compact = false,
}: {
  sections: NavSection[];
  collapsed: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();
  return (
    <>
      {sections.map((section, index) => (
        <div
          key={section.label ?? "dashboard"}
          className={index ? `${compact ? "mt-2 pt-2" : "mt-3 pt-3"} border-t border-line` : undefined}
        >
          {/* accent-label, not accent: raw accent on the light theme's paper
              rail is only 2.7:1 and fails even the large-text bar. The token
              keeps full brand orange on dark and darkens on light. */}
          {section.label && !collapsed && (
            <p className="truncate px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-label">
              {section.label}
            </p>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center rounded-lg py-2 text-sm transition-colors ${
                    collapsed ? "justify-center px-2" : "gap-2.5 px-3"
                  } ${
                    active
                      ? "bg-accent/10 font-medium text-accent"
                      : "text-muted hover:bg-ink-card hover:text-fg"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Admin navigation. The desktop rail collapses to icons only (remembered
 * across visits); on mobile the same links open in a slide-over.
 */
export function AdminSidebar({
  sections,
  brand,
  brandMark,
  footer,
}: {
  sections: NavSection[];
  brand: React.ReactNode;
  /** Logo without the wordmark, for the collapsed rail. */
  brandMark: React.ReactNode;
  footer: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    collapsedStore.subscribe,
    collapsedStore.getSnapshot,
    collapsedStore.getServerSnapshot,
  );

  const toggle = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsedStore.getSnapshot() ? "0" : "1");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  // The slide-over closes from the link handler below, so no pathname effect.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop rail */}
      {/*
        Sticky, its own height, its own scrollbar.

        As a plain flex child the rail stretched to the *page* height — 3967px
        on the settings page — so scrolling took the logo, every nav link and
        the sign-out footer off the top of the screen with it. `h-screen` stops
        the stretch (an explicit height beats `align-items: stretch`), which is
        what gives `sticky` room to work, and `overflow-y-auto` keeps the rail
        usable when the nav is taller than a short viewport.
      */}
      <aside
        className={`hidden shrink-0 border-r border-line bg-ink-soft p-4 transition-[width] duration-200 md:sticky md:top-0 md:block md:h-screen md:self-start md:overflow-y-auto ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div
          className={
            collapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between gap-2"
          }
        >
          {/* overflow-hidden is the guard, not the fix: the wordmark is
              `whitespace-nowrap`, so without a clip it simply painted itself
              underneath the collapse button. */}
          <div className="min-w-0 flex-1 overflow-hidden">
            {collapsed ? brandMark : brand}
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9.5 4v16" />
              {collapsed ? <path d="M13.5 9.5l2.5 2.5-2.5 2.5" /> : <path d="M16.5 9.5L14 12l2.5 2.5" />}
            </svg>
          </button>
        </div>

        <nav className="mt-6">
          <NavLinks sections={sections} collapsed={collapsed} />
        </nav>

        {!collapsed && <div className="mt-8 border-t border-line pt-4">{footer}</div>}
      </aside>

      {/*
        Mobile top bar.

        This used to be a lone button at `top-4`, which was unreachable once the
        app was installed on an iPhone: standalone mode with a translucent status
        bar draws the page *under* the notch, and the top ~47-59px belong to iOS,
        which swallows the touch. Nothing looked broken — the button was simply
        dead. Owning the safe-area inset here is what makes it tappable, and the
        bar earns its keep by carrying the brand as well.
      */}
      <header
        className={`fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-line bg-ink-soft/95 px-4 backdrop-blur md:hidden ${MOBILE_BAR_HEIGHT} pt-[env(safe-area-inset-top)]`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-ink-card text-fg"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">{brand}</div>
      </header>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
        >
          <div
            /* Same inset as the top bar: without it the close button and the
               brand sit under the iPhone status bar and cannot be tapped. */
            className="h-full w-72 max-w-[85vw] overflow-y-auto border-r border-line bg-ink-soft p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">{brand}</div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:border-accent hover:text-accent"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav className="mt-6">
              <NavLinks sections={sections} collapsed={false} compact onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="mt-8 border-t border-line pt-4">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
