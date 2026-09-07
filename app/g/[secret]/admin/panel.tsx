"use client";

import { useState, useTransition } from "react";

import type { PriceTier } from "@/lib/db/schema";

import {
  addMember,
  archiveMember,
  closeEarly,
  overrideChosenDate,
  overrideTier,
  reroll,
  rotateGroupLink,
  type AdminResult,
} from "./admin-actions";
import styles from "./admin.module.css";

export type PanelProps = {
  secret: string;
  people: {
    id: string;
    name: string;
    isAdmin: boolean;
    firstClaimedAt: Date | null;
  }[];
  outing: {
    id: string;
    month: string;
    tier: PriceTier;
    status: "open" | "announced" | "done";
    chosenDate: string | null;
    rerolled: boolean;
  } | null;
  topDays: { day: string; count: number; label: string }[];
  emptyTier: boolean;
};

export function Panel({ secret, people, outing, topDays, emptyTier }: PanelProps) {
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<AdminResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setNote(result.note ?? "Done.");
        setError(null);
      } else {
        setError(result.error);
        setNote(null);
      }
    });
  }

  return (
    <>
      {note ? <p className={styles.note}>{note}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.section}>
        <h2 className={styles.heading}>Who&rsquo;s in</h2>
        <form
          className={styles.addRow}
          action={(formData) => {
            const name = String(formData.get("name") ?? "");
            run(() => addMember(secret, name));
          }}
        >
          <input
            name="name"
            className={styles.field}
            placeholder="Add someone by name"
            autoComplete="off"
            maxLength={40}
          />
          <button type="submit" disabled={pending}>
            Add
          </button>
        </form>

        <ul className={styles.people}>
          {people.map((person) => (
            <li key={person.id}>
              <span>
                {person.name}
                {person.isAdmin ? <em className={styles.tag}>admin</em> : null}
                {!person.firstClaimedAt ? (
                  <em className={styles.pending}>not opened yet</em>
                ) : null}
              </span>
              {!person.isAdmin ? (
                <button
                  type="button"
                  className={styles.quiet}
                  disabled={pending}
                  onClick={() => run(() => archiveMember(secret, person.id))}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          Removing someone keeps their restaurants and their past dinners. They just
          stop counting toward dates.
        </p>
      </section>

      {outing ? (
        <section className={styles.section}>
          <h2 className={styles.heading}>This month</h2>

          <div className={styles.control}>
            <span className={styles.label}>Price tier</span>
            <div className={styles.choices}>
              {(["low", "medium", "high"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={pending}
                  className={tier === outing.tier ? styles.chosen : undefined}
                  onClick={() => run(() => overrideTier(secret, outing.id, tier))}
                >
                  {tier === "low" ? "£" : tier === "medium" ? "££" : "£££"}
                </button>
              ))}
            </div>
          </div>

          {topDays.length > 0 ? (
            <div className={styles.control}>
              <span className={styles.label}>
                {outing.status === "open" ? "Leading dates" : "Date"}
              </span>
              <div className={styles.choices}>
                {topDays.map((day) => (
                  <button
                    key={day.day}
                    type="button"
                    disabled={pending}
                    className={
                      day.day === outing.chosenDate ? styles.chosen : undefined
                    }
                    onClick={() =>
                      run(() => overrideChosenDate(secret, outing.id, day.day))
                    }
                  >
                    {day.label} <em>{day.count}</em>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {emptyTier ? (
            <p className={styles.warn}>
              Nothing in this month&rsquo;s tier, so there is nothing to draw. Add a
              restaurant or change the tier.
            </p>
          ) : null}

          <div className={styles.buttons}>
            {outing.status === "open" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => closeEarly(secret))}
              >
                Close now and draw
              </button>
            ) : null}

            {outing.status !== "open" && !outing.rerolled ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => reroll(secret, outing.id))}
              >
                Draw again
              </button>
            ) : null}

            {outing.rerolled ? (
              <span className={styles.hint}>
                Already redrawn once this month.
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.heading}>The link</h2>
        <p className={styles.hint}>
          Rotating it shuts out anyone who hasn&rsquo;t opened Reso yet. Everyone
          already signed in on their phone stays signed in.
        </p>
        <button
          type="button"
          className={styles.danger}
          disabled={pending}
          onClick={() => run(() => rotateGroupLink(secret))}
        >
          Rotate the group link
        </button>
      </section>
    </>
  );
}
