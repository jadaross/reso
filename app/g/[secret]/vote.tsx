"use client";

import { useState, useTransition } from "react";

import { monthName } from "@/lib/cycle/announcement";
import { CHOICE_LABEL, CHOICES, type VoteView } from "@/lib/cycle/month-choice";
import type { MonthChoice } from "@/lib/db/schema";

import { castVoteAction } from "./vote-actions";
import styles from "./vote.module.css";

const MARK: Record<MonthChoice, string> = {
  low: "£",
  medium: "££",
  high: "£££",
  party: "",
};

/**
 * The vote on what kind of month the one after next should be.
 *
 * The rota used to decide alone. Now it is the fallback: it stands when nobody
 * votes and breaks a tie it happens to be in. Votes are by name, like everything
 * else here, so the group can see what it is leaning toward while it leans.
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The server's tally, with my own vote moved to wherever I have just put it.
  const names: Record<MonthChoice, string[]> = {
    low: [],
    medium: [],
    high: [],
    party: [],
  };
  for (const choice of CHOICES) {
    names[choice] = view.byChoice[choice].filter((name) => name !== me);
  }
  if (mine) names[mine] = [...names[mine], me].sort((a, b) => a.localeCompare(b, "en-GB"));

  const total = CHOICES.reduce((sum, choice) => sum + names[choice].length, 0);

  function pick(choice: MonthChoice) {
    const next = mine === choice ? null : choice;
    setMine(next);
    startTransition(async () => {
      const result = await castVoteAction(secret, next);
      if (!result.ok) {
        setMine(view.mine);
        setError(result.error);
      } else {
        setError(null);
      }
    });
  }

  const month = monthName(view.month);

  return (
    <section className={styles.vote} aria-labelledby="month-vote">
      <h2 id="month-vote" className={styles.heading}>
        What kind of month should {month} be?
      </h2>
      <p className={styles.small}>
        One vote each, counted on 1 {monthName(view.countedOn)} when {month} opens.
        No votes and it&rsquo;s the rota&rsquo;s turn: {CHOICE_LABEL[view.rota].toLowerCase()}.
        A tie goes to the rota if it&rsquo;s in the running, otherwise a draw.
      </p>

      <div className={styles.choices} role="group" aria-label={`Your vote for ${month}`}>
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
              <span className={styles.label}>
                {MARK[choice] ? <span className={styles.mark}>{MARK[choice]}</span> : null}
                {CHOICE_LABEL[choice]}
              </span>
              <span className={styles.count}>{names[choice].length}</span>
            </button>
          );
        })}
      </div>

      {total > 0 ? (
        <dl className={styles.tally}>
          {CHOICES.filter((choice) => names[choice].length > 0).map((choice) => (
            <div key={choice} className={styles.tallyRow}>
              <dt>{CHOICE_LABEL[choice]}</dt>
              <dd>{names[choice].join(", ")}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.small}>Nobody has voted yet.</p>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
