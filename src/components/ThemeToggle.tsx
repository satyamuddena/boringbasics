"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "boring_basics_theme";

/* Tiny external store over the <html> class list, shared by all toggles. */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const isLight = () => document.documentElement.classList.contains("light");

function setTheme(light: boolean) {
  document.documentElement.classList.toggle("light", light);
  try {
    localStorage.setItem(STORAGE_KEY, light ? "light" : "dark");
  } catch {
    /* private mode — theme just won't persist */
  }
  listeners.forEach((cb) => cb());
}

/**
 * Dark/light toggle. Dark is the brand default; the choice persists in
 * localStorage and is applied before paint by the inline script in the root
 * layout (no flash). Works on the public site and the admin panel alike.
 */
export function ThemeToggle({
  className = "",
  onDark = false,
}: {
  className?: string;
  /**
   * Sitting on dark media (the home hero) rather than a themed surface, so the
   * icon and border are fixed to white. A prop rather than caller classes for
   * the same layer-order reason as BrandLogo's.
   */
  onDark?: boolean;
}) {
  // Server snapshot: dark (brand default) — corrected on hydration if stored light.
  const light = useSyncExternalStore(subscribe, isLight, () => false);

  /*
    Re-assert the stored preference once mounted.

    The pre-paint script in the root layout is what normally applies the class,
    but it only runs while the initial HTML is parsed. If hydration fails for
    any reason React re-renders from the server tree and drops the class, and
    the preference is lost with no way back until the next toggle. Reading
    localStorage here restores it, so a mismatch anywhere on the page can't
    silently strip the theme.
  */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) === "light";
      if (stored !== isLight()) setTheme(stored);
    } catch {
      /* private mode — nothing stored to restore */
    }
  }, []);

  function toggle() {
    setTheme(!isLight());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
        onDark
          ? "border-white/30 text-white/80 hover:border-white hover:text-white"
          : "border-line text-muted hover:border-accent hover:text-accent"
      } ${className}`}
    >
      {light ? (
        /* moon — click to go dark */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        /* sun — click to go light */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
