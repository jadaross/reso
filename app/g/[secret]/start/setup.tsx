"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import styles from "./start.module.css";

type Stage = "install" | "notifications" | "done";

/**
 * The setup screen, which changes depending on where it is being read.
 *
 * The order is forced by iOS, not chosen: notifications can only be turned on from
 * an installed Home Screen app, never from a Safari tab. So this asks for the
 * install first and only offers the notification button once it is running as an
 * app — and it can tell the difference, so nobody is shown a step they cannot do.
 */
export function Setup({ secret, name }: { secret: string; name: string }) {
  const standalone = useStandalone();
  const permission = useNotificationPermission();
  const [chosen, setChosen] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const granted = (chosen ?? permission) === "granted";
  const denied = (chosen ?? permission) === "denied";
  const stage: Stage = !standalone
    ? "install"
    : granted
      ? "done"
      : "notifications";

  useEffect(() => {
    if (!standalone || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => setError("Couldn't start the notifier."));
  }, [standalone]);

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      // First thing after the tap. iOS ignores this if anything is awaited before
      // it, because by then the user gesture has expired.
      const result = await Notification.requestPermission();
      setChosen(result);
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
      if (!response.ok) setError("Couldn't save your notification settings.");
    } catch {
      setError("Couldn't turn notifications on.");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "install") {
    return (
      <>
        <p className={styles.hello}>Hello {name}.</p>
        <h1 className={styles.title}>Put Reso on your phone</h1>
        <p className={styles.lede}>
          It takes about twenty seconds and it&rsquo;s the only way to get the
          reminders. Apple won&rsquo;t send them to a Safari tab.
        </p>

        <ol className={styles.steps}>
          <li>
            <strong>Tap the Share button.</strong> The square with an arrow coming
            out of it, at the bottom of Safari.
          </li>
          <li>
            <strong>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</strong>{" "}
            Then tap Add.
          </li>
          <li>
            <strong>Open Reso from the new icon</strong> and tap your name once
            more.
          </li>
        </ol>

        <p className={styles.aside}>
          It really does ask who you are a second time. The app keeps its own
          memory, separate from Safari, so it hasn&rsquo;t met you yet. After that
          it remembers you for good.
        </p>

        <Link className={styles.skip} href={`/g/${secret}`}>
          I&rsquo;ll do it later
        </Link>
      </>
    );
  }

  if (stage === "notifications") {
    return (
      <>
        <p className={styles.hello}>Nice one, {name}.</p>
        <h1 className={styles.title}>One more tap</h1>
        <p className={styles.lede}>
          Reso will tell you when a month opens, nudge you if you haven&rsquo;t put
          your dates in, and say where everyone is going once it&rsquo;s settled.
        </p>

        {denied ? (
          <p className={styles.aside}>
            Notifications are switched off for Reso. To turn them back on: iPhone
            Settings, then Notifications, then Reso.
          </p>
        ) : (
          <button
            type="button"
            className={styles.primary}
            onClick={turnOn}
            disabled={busy}
          >
            {busy ? "Turning them on…" : "Turn on notifications"}
          </button>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}

        <Link className={styles.skip} href={`/g/${secret}`}>
          Skip for now
        </Link>
      </>
    );
  }

  return (
    <>
      <p className={styles.hello}>You&rsquo;re set, {name}.</p>
      <h1 className={styles.title}>That&rsquo;s everything</h1>
      <p className={styles.lede}>
        Reso is on your Home Screen and notifications are on. You&rsquo;ll hear
        from it on the 1st, and again when the month is settled.
      </p>
      <Link className={styles.primary} href={`/g/${secret}`}>
        Go to this month
      </Link>
    </>
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS predates the standard display-mode query for this.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

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
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
