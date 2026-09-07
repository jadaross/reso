"use client";

import { useState } from "react";

import styles from "./reveal.module.css";

/**
 * The whole WhatsApp story, in one button.
 *
 * Nothing can post to a WhatsApp group from a server — Meta's group API only
 * creates its own small groups for verified businesses, and the unofficial
 * libraries risk the number being banned. See docs/research/reminder-channels.md.
 * So the site writes the message and a human forwards it: Share opens the iOS
 * share sheet, they pick the group, they send. Two taps, no API, no ban risk.
 */
export function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function send() {
    // navigator.share needs a user gesture and HTTPS; both hold here.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // A cancelled share sheet lands here too, so fall through quietly to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <button type="button" className={styles.share} onClick={send}>
        Send it to the group
      </button>
      {state === "copied" ? (
        <p className={styles.shareNote}>Copied. Paste it into the group chat.</p>
      ) : null}
      {state === "failed" ? (
        <p className={styles.shareNote}>
          Couldn&rsquo;t share automatically — the message is written out below.
        </p>
      ) : null}
    </>
  );
}
