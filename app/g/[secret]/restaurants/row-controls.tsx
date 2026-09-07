"use client";

import { useState, useTransition } from "react";

import type { PriceTier } from "@/lib/db/schema";

import { setAddress, setTier } from "./pick-actions";
import styles from "./restaurants.module.css";

const MARK: Record<PriceTier, string> = { low: "£", medium: "££", high: "£££" };

/**
 * The tier is a control, not a label.
 *
 * Whoever adds a place guesses its tier, and a guess that nobody can correct sends
 * a cheap restaurant to an expensive month forever. Every Member can change it,
 * which is the same trust model as the rest of the app: six friends, no permissions.
 */
export function TierControl({
  secret,
  pickIds,
  tier,
}: {
  secret: string;
  pickIds: string[];
  tier: PriceTier;
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState(tier);

  return (
    <label className={styles.price}>
      <span aria-hidden>{MARK[shown]}</span>
      <select
        aria-label="Roughly what it costs"
        value={shown}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as PriceTier;
          setShown(next);
          startTransition(async () => setTier(secret, pickIds, next));
        }}
      >
        <option value="low">£ Cheap</option>
        <option value="medium">££ Middling</option>
        <option value="high">£££ Expensive</option>
      </select>
    </label>
  );
}

/** Google links carry no address, so the gap is filled by hand or not at all. */
export function AddressControl({
  secret,
  pickIds,
}: {
  secret: string;
  pickIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" className={styles.addressButton} onClick={() => setOpen(true)}>
        no address yet
      </button>
    );
  }

  return (
    <form
      className={styles.addressForm}
      action={(formData) => {
        const value = String(formData.get("address") ?? "");
        startTransition(async () => {
          await setAddress(secret, pickIds, value);
          setOpen(false);
        });
      }}
    >
      <input
        name="address"
        className={styles.addressField}
        placeholder="Street and postcode"
        autoFocus
        autoComplete="off"
      />
      <button type="submit" disabled={pending}>
        Save
      </button>
    </form>
  );
}
