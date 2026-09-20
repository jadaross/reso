"use client";

import { useActionState } from "react";

import { addPick, type AddResult } from "./pick-actions";
import styles from "./restaurants.module.css";

const TIERS = [
  { value: "low", label: "£", hint: "Cheap" },
  { value: "medium", label: "££", hint: "Middling" },
  { value: "high", label: "£££", hint: "Expensive" },
] as const;

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
          <label key={tier.value} className={styles.tier}>
            <input
              type="radio"
              name="tier"
              value={tier.value}
              defaultChecked={index === 0}
            />
            <span>
              {tier.label}
              <small>{tier.hint}</small>
            </span>
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
