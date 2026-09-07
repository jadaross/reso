"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * The "turn on notifications" button.
 *
 * Three iOS constraints shape this, all from ticket 03:
 *  - `Notification.requestPermission()` only works from inside a real tap handler,
 *    so it is called first in onClick with nothing awaited before it.
 *  - It only works in the installed Home Screen app, never in Safari, so the button
 *    hides itself unless the app is running standalone.
 *  - The service worker must already be registered before subscribing.
 */
export function EnablePush() {
  const standalone = useStandalone();
  const reportedPermission = useNotificationPermission();
  const [chosenPermission, setChosenPermission] =
    useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permission = chosenPermission ?? reportedPermission;

  useEffect(() => {
    if (!standalone || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      setError("Could not start the notifier.");
    });
  }, [standalone]);

  if (!standalone) {
    return (
      <p>
        Add Reso to your Home Screen to turn on notifications — Share, then Add to
        Home Screen.
      </p>
    );
  }

  if (permission === "granted") return <p>Notifications are on.</p>;
  if (permission === "denied") {
    return <p>Notifications are off. Turn them back on in iPhone Settings.</p>;
  }

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      // Must be the first thing after the tap: iOS ignores this if it is reached
      // after an await, because the user gesture has expired by then.
      const result = await Notification.requestPermission();
      setChosenPermission(result);
      if (result !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
        ),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) setError("Could not save your notification settings.");
    } catch {
      setError("Could not turn notifications on.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={subscribe} disabled={busy}>
        {busy ? "Turning on…" : "Turn on notifications"}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS predates the standard display-mode query for this.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/** Browser-only state, so it is read through a store rather than set in an effect. */
function useStandalone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(display-mode: standalone)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    isStandalone,
    () => false,
  );
}

const noSubscription = () => () => {};

function useNotificationPermission(): NotificationPermission | null {
  return useSyncExternalStore(
    noSubscription,
    () => ("Notification" in window ? Notification.permission : null),
    () => null,
  );
}

/** VAPID keys travel as base64url; PushManager wants raw bytes. */
function decodeVapidKey(key: string): Uint8Array<ArrayBuffer> {
  const padded = (key + "=".repeat((4 - (key.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binary = atob(padded);
  // Backed by an explicit ArrayBuffer: PushManager will not take the
  // SharedArrayBuffer-compatible type that `new Uint8Array(length)` widens to.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
