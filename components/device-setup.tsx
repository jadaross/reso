"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { sendMyselfATest } from "@/app/g/[secret]/(app)/actions";

import styles from "./device-setup.module.css";

/**
 * Install and notifications, which used to be a full-screen wall after a name
 * was picked.
 *
 * iOS only delivers Web Push from an installed Home Screen app, so the steps
 * stay, but they open on demand. The banner is per Device (localStorage, same
 * flag the old "I'll do it later" wrote) and is absent in standalone display
 * mode. Saying Later does not touch notifications, and the setup sheet does not
 * read that flag — which is what made the old page bounce straight back.
 */

const DISMISSED = "reso-install-skipped";
const DISMISS_EVENT = "reso-install-dismissed";

export function InstallBanner() {
  const standalone = useStandalone();
  const dismissed = useDismissed();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Server snapshot treats the app as installed, so a Home Screen launch never
  // paints this and then removes it. A browser tab shows it after hydration.
  if (standalone || dismissed || hidden) return null;

  return (
    <div className={styles.banner}>
      <p className={styles.bannerCopy}>
        Add Reso to your Home Screen · it&rsquo;s how reminders reach you
      </p>
      <div className={styles.bannerActions}>
        <button
          type="button"
          className={styles.show}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Show me
        </button>
        <button
          type="button"
          className={styles.later}
          onClick={() => {
            dismissInstallBanner();
            setHidden(true);
          }}
        >
          Later
        </button>
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add to your Home Screen"
      >
        <InstallSteps />
      </Sheet>
    </div>
  );
}

export function NotificationsSetup({ secret }: { secret: string }) {
  const [open, setOpen] = useState(false);
  useInstalledNotifier();

  return (
    <>
      <p className={styles.setupLine}>
        <button
          type="button"
          className={styles.setupLink}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Notifications and setup
        </button>
      </p>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications and setup"
      >
        {open ? <SetupBody secret={secret} /> : null}
      </Sheet>
    </>
  );
}

/** The old /start URL: the same steps and controls, on the page rather than in a sheet. */
export function SetupPage({ secret }: { secret: string }) {
  useInstalledNotifier();

  return (
    <>
      <h1 className={styles.sheetTitle}>Notifications and setup</h1>
      <SetupBody secret={secret} />
    </>
  );
}

function SetupBody({ secret }: { secret: string }) {
  return (
    <>
      <NotificationControls secret={secret} />
      <InstallSteps />
    </>
  );
}

function InstallSteps() {
  return (
    <>
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
      <p className={styles.once}>
        The app asks your name once more; its memory is separate from Safari.
      </p>
    </>
  );
}

function NotificationControls({ secret }: { secret: string }) {
  const standalone = useStandalone();
  const permission = useNotificationPermission();
  const labelId = useId();
  const [chosen, setChosen] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<
    { ok: true; note: string } | { ok: false; error: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const current = chosen ?? permission;
  const denied = current === "denied";
  const on = current === "granted" && subscribed;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!("serviceWorker" in navigator)) return;
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(subscription));
      } catch {
        if (!cancelled) setSubscribed(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setNotice(null);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setNotice({
          ok: false,
          error: "Notifications turn on from the Home Screen app.",
        });
        return;
      }

      // First thing after the tap. iOS ignores a permission request if anything
      // is awaited before it, because by then the user gesture has expired.
      let result = Notification.permission;
      if (result !== "granted") {
        result = await Notification.requestPermission();
        setChosen(result);
      }
      if (result !== "granted") return;

      await navigator.serviceWorker.register("/sw.js");
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
      if (!response.ok) {
        setNotice({ ok: false, error: "Couldn't save your notification settings." });
        return;
      }
      setSubscribed(true);
    } catch {
      setNotice({
        ok: false,
        error: standalone
          ? "Couldn't turn notifications on."
          : "Notifications turn on from the Home Screen app.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setNotice(null);
    try {
      const registration =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker.getRegistration()
          : undefined;
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } catch {
      setNotice({ ok: false, error: "Couldn't turn notifications off." });
    } finally {
      setBusy(false);
    }
  }

  function sendTest() {
    setNotice(null);
    startTransition(async () => {
      setNotice(await sendMyselfATest(secret));
    });
  }

  return (
    <>
      <div className={styles.notify}>
        <span id={labelId}>Notifications</span>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={on}
          aria-labelledby={labelId}
          disabled={busy || !ready || denied}
          onClick={on ? turnOff : turnOn}
        >
          {on ? "On" : "Off"}
        </button>
      </div>

      {denied ? (
        <p className={styles.note}>
          Notifications are switched off for Reso. To turn them back on: iPhone
          Settings, then Notifications, then Reso.
        </p>
      ) : null}

      {notice ? (
        <p className={notice.ok ? styles.note : styles.error}>
          {notice.ok ? notice.note : notice.error}
        </p>
      ) : null}

      <button
        type="button"
        className={styles.test}
        onClick={sendTest}
        disabled={busy || pending}
      >
        {pending ? "Sending…" : "Send myself a test"}
      </button>
    </>
  );
}

function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.sheetCard}>
        <div className={styles.sheetBar}>
          <h2 id={titleId} className={styles.sheetTitle}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function useInstalledNotifier() {
  useEffect(() => {
    // Read the live display mode. The hook's server snapshot pretends the app
    // is installed so the banner does not flash, and must not be what decides
    // whether to register the worker.
    if (!isStandalone() || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Turning notifications on reports the failure, at the moment it matters.
    });
  }, []);
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
}

function dismissInstallBanner(): void {
  try {
    window.localStorage.setItem(DISMISSED, "1");
  } catch {
    // Private browsing: the banner still hides for this view via component state.
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

function useDismissed(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(DISMISS_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(DISMISS_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    readDismissed,
    () => false,
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
    () => true,
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
