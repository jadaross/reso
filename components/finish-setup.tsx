"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import styles from "./finish-setup.module.css";

/**
 * A quiet reminder for anyone who skipped the setup, and nothing at all for anyone
 * who did not.
 *
 * It renders only when there is genuinely something left to do — not installed, or
 * installed without notifications — so it disappears for good rather than becoming
 * something people learn to scroll past.
 */
export function FinishSetup({ secret }: { secret: string }) {
  const standalone = useStandalone();
  const permission = useNotificationPermission();

  // The server-side defaults are deliberately "installed and allowed", so this
  // renders nothing until the client says otherwise and never flashes on a phone
  // that is already set up.
  if (standalone && permission === "granted") return null;

  return (
    <Link className={styles.nudge} href={`/g/${secret}/start`}>
      <strong>
        {standalone ? "Turn on notifications" : "Put Reso on your Home Screen"}
      </strong>
      {standalone
        ? "So you hear when the month is settled."
        : "Two taps, and it's the only way to get reminders."}
    </Link>
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
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
    () => "granted" as NotificationPermission,
  );
}
