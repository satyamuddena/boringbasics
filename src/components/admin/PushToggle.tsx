"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "@/app/admin/(panel)/actions";

/**
 * Turns booking notifications on for this device.
 *
 * Most of this component is the iOS story. Safari only delivers web push to a
 * PWA that has been added to the Home Screen — never from a browser tab, and
 * there is no way to trigger the install from script. So rather than showing a
 * button that would silently do nothing, an iPhone in a tab gets the actual
 * instructions.
 */

type State =
  | "loading"
  | "unsupported" // no service worker / push API at all
  | "needs-install" // iOS in a tab: must be added to the Home Screen first
  | "off"
  | "on"
  | "denied"; // permission refused; only the OS settings can undo it

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // Safari's own non-standard flag, which is what actually works on iOS.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

/** VAPID keys travel as base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  // Backed by an explicit ArrayBuffer so the type satisfies BufferSource — a
  // bare `new Uint8Array(n)` widens to ArrayBufferLike, which includes
  // SharedArrayBuffer and is rejected by applicationServerKey.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** ArrayBuffer key material → the base64url strings the server stores. */
function encodeKey(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const serialise = (sub: PushSubscription) => ({
  endpoint: sub.endpoint,
  p256dh: encodeKey(sub.getKey("p256dh")),
  auth: encodeKey(sub.getKey("auth")),
});

export function PushToggle({ className = "" }: { className?: string }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const register = useCallback(async () => {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  // On mount: work out which of the six states we are in, and re-post any
  // subscription the browser still holds. That re-post is what repairs the
  // record after the session expired and the trainer logged in again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) {
        setState(isIOS() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (isIOS() && !isStandalone()) {
        setState("needs-install");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const registration = await register();
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        if (existing && Notification.permission === "granted") {
          await savePushSubscriptionAction(serialise(existing));
          if (!cancelled) setState("on");
        } else {
          setState("off");
        }
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [register, vapidKey]);

  async function turnOn() {
    setMessage(null);
    // Must be called from inside the click handler — iOS rejects a permission
    // request that is not tied to a user gesture.
    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      setState("denied");
      return;
    }
    if (permission !== "granted") return;

    try {
      const registration = await register();
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!),
        }));
      const result = await savePushSubscriptionAction(serialise(sub));
      if (!result.ok) {
        setMessage(result.error ?? "Could not save this device.");
        return;
      }
      setState("on");
      setMessage("You will get a notification for every new booking.");
    } catch {
      setMessage("Could not turn notifications on for this device.");
    }
  }

  async function turnOff() {
    try {
      const registration = await register();
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setMessage(null);
    } catch {
      setMessage("Could not turn notifications off.");
    }
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestPushAction();
      setMessage(
        result.ok
          ? "Test sent — it should appear in a moment."
          : (result.skipped ?? result.error ?? "The test could not be sent."),
      );
    });
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className={`rounded-lg border border-line bg-ink-card p-3 text-sm ${className}`}>
      {state === "needs-install" && (
        <div>
          <p className="font-semibold">Get booking alerts on this iPhone</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted">
            <li>
              Tap the Share button <span aria-hidden>&#x2191;</span> at the bottom of Safari
            </li>
            <li>Choose &ldquo;Add to Home Screen&rdquo;</li>
            <li>Open Boring Basics from the new icon, then turn notifications on here</li>
          </ol>
          <p className="mt-2 text-xs text-muted">
            Apple only allows notifications from an app on the Home Screen, not from a Safari
            tab.
          </p>
        </div>
      )}

      {state === "denied" && (
        <div>
          <p className="font-semibold">Notifications are blocked</p>
          <p className="mt-1 text-xs text-muted">
            This device refused them earlier. Allow notifications for this site in your browser
            settings, then reload.
          </p>
        </div>
      )}

      {state === "off" && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Booking alerts are off</p>
            <p className="text-xs text-muted">Get a notification the moment someone books.</p>
          </div>
          <button
            type="button"
            onClick={turnOn}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Turn on
          </button>
        </div>
      )}

      {state === "on" && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ok">Booking alerts are on</p>
            <p className="text-xs text-muted">This device will buzz for new bookings.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={sendTest}
              disabled={pending}
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send test"}
            </button>
            <button
              type="button"
              onClick={turnOff}
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-bad hover:text-bad"
            >
              Turn off
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-2 text-xs text-muted">{message}</p>}
    </div>
  );
}
