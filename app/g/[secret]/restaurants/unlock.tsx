"use client";

import { useActionState } from "react";

import { enterAdminPin, type ActionResult } from "../actions";
import styles from "./restaurants.module.css";

/**
 * The Admin's way into the list.
 *
 * Deliberately not a prompt everyone sees: an Admin who has not unlocked on this
 * device gets the same hidden list as anyone else, so the PIN is asked for only
 * when there is something behind it.
 */
export function Unlock({ secret }: { secret: string }) {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    async (_previous, formData) =>
      enterAdminPin(secret, String(formData.get("pin") ?? "")),
    null,
  );

  return (
    <form action={action} className={styles.unlock}>
      <input
        name="pin"
        className={styles.pin}
        placeholder="Admin PIN"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
      />
      <button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Unlock"}
      </button>
      {result && !result.ok ? (
        <p className={styles.error}>{result.error}</p>
      ) : null}
    </form>
  );
}
