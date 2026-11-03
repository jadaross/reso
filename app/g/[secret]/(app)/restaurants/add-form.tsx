"use client";

import { useActionState } from "react";

import { formatPriceTier } from "@/lib/cycle/tier";
import type { PriceTier } from "@/lib/db/schema";

import { addPick, type AddResult } from "./pick-actions";
import styles from "./restaurants.module.css";

const TIERS: readonly PriceTier[] = ["low", "medium", "high"];

export function AddForm({ secret }: { secret: string }) {
  const [result, action, pending] = useActionState<AddResult | null, FormData>(
    async (_previous, formData) => addPick(formData),
    null,
  );

  return (
    <form action={action} className={styles.add}>
      <input type="hidden" name="secret" value={secret} />
      <input
        className={styles.field}
        name="name"
        placeholder="Name of the place"
        autoComplete="off"
      />
      <input
        className={styles.field}
        name="link"
        placeholder="Apple or Google Maps link (optional)"
        inputMode="url"
        autoComplete="off"
      />
      <div className={styles.tiers} role="radiogroup" aria-label="Roughly what it costs">
        {TIERS.map((tier, index) => (
          <label key={tier} className={styles.tier}>
            <input
              type="radio"
              name="tier"
              value={tier}
              defaultChecked={index === 0}
            />
            <span>{formatPriceTier(tier)}</span>
          </label>
        ))}
      </div>
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Adding…" : "Add it"}
      </button>
      {result && !result.ok ? (
        <p className={styles.error}>{result.error}</p>
      ) : null}
      {result?.ok && result.note ? (
        <p className={styles.note}>{result.note}</p>
      ) : null}
    </form>
  );
}
