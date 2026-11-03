"use client";

import { useState, useTransition } from "react";

import { CHOICES, formatMonthChoice, type VoteView } from "@/lib/cycle/month-choice";
import { tieRule, voteDoorLine } from "@/lib/cycle/doors";
import type { MonthChoice } from "@/lib/db/schema";

import { castVoteAction } from "./vote-actions";
import styles from "./vote.module.css";

/**
 * The refresh after a vote remounts this door. Remember that it was open so it
 * does not fold itself shut the moment a vote lands.
 */
const heldOpen = new Set<string>();

/**
 * The vote on what kind of month the one after next should be.
 *
 * A door, like the others: one line when shut, the four choices and the tie
 * rule when open. It stays open after a vote.
 */
export function Vote({
  secret,
  view,
  me,
}: {
  secret: string;
  view: VoteView;
  me: string;
}) {
  const [mine, setMine] = useState<MonthChoice | null>(view.mine);
  const [open, setOpen] = useState(() => heldOpen.has(view.month));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The server's tally, with my own vote moved to wherever I have just put it.
  const names: Record<MonthChoice, string[]> = { low: [], medium: [], high: [], party: [] };
  for (const choice of CHOICES) {
    names[choice] = view.byChoice[choice].filter((name) => name !== me);
  }
  if (mine) names[mine] = [...names[mine], me].sort((a, b) => a.localeCompare(b, "en-GB"));

  const total = CHOICES.reduce((sum, choice) => sum + names[choice].length, 0);

  function setDoor(next: boolean) {
    if (next) heldOpen.add(view.month);
    else heldOpen.delete(view.month);
    setOpen(next);
  }

  function pick(choice: MonthChoice) {
    const next = mine === choice ? null : choice;
    setMine(next);
    setDoor(true);
    startTransition(async () => {
      const result = await castVoteAction(secret, next);
      if (!result.ok) {
        setMine(view.mine);
        setError(result.error);
      } else {
        setError(null);
        setDoor(true);
      }
    });
  }

  const month = view.month;

  return (
    <section aria-labelledby="month-vote">
      <button
        type="button"
        className={styles.door}
        aria-expanded={open}
        onClick={() => setDoor(!open)}
      >
        <strong id="month-vote">{voteDoorLine(month, total, view.countedOn)}</strong>
        <span className={styles.chevron} aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className={styles.panel}>
          <p className={styles.tie}>{tieRule()}</p>
          <div className={styles.choices} role="group" aria-label="Your vote">
            {CHOICES.map((choice) => {
              const on = mine === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={on}
                  disabled={pending}
                  className={on ? `${styles.choice} ${styles.on}` : styles.choice}
                  onClick={() => pick(choice)}
                >
                  <span>{formatMonthChoice(choice)}</span>
                  <span className={styles.count}>{names[choice].length}</span>
                </button>
              );
            })}
          </div>

          {total > 0 ? (
            <dl className={styles.tally}>
              {CHOICES.filter((choice) => names[choice].length > 0).map((choice) => (
                <div key={choice} className={styles.tallyRow}>
                  <dt>{formatMonthChoice(choice)}</dt>
                  <dd>{names[choice].join(", ")}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
