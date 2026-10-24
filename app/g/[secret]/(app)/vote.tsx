"use client";

import { useState, useTransition } from "react";

import { monthName, shortDate } from "@/lib/cycle/announcement";
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
 * Folded up once you have voted, with the state of play on one line; open
 * until you have, because that is the one thing it wants from you. The rota
 * is the fallback: it stands when nobody votes and breaks a tie it is in.
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
  const [open, setOpen] = useState(view.mine === null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The server's tally, with my own vote moved to wherever I have just put it.
  const names: Record<MonthChoice, string[]> = { low: [], medium: [], high: [], party: [] };
  for (const choice of CHOICES) {
    names[choice] = view.byChoice[choice].filter((name) => name !== me);
  }
  if (mine) names[mine] = [...names[mine], me].sort((a, b) => a.localeCompare(b, "en-GB"));

  const total = CHOICES.reduce((sum, choice) => sum + names[choice].length, 0);
  const top = Math.max(...CHOICES.map((choice) => names[choice].length));
  const leaders = CHOICES.filter((choice) => names[choice].length === top && top > 0);

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
  const summary =
    total === 0
      ? `Nobody has voted. The rota says ${CHOICE_LABEL[view.rota].toLowerCase()}.`
      : leaders.length === 1
        ? `${CHOICE_LABEL[leaders[0]]} leads, ${top} of ${total}.`
        : `Tied between ${leaders.map((choice) => CHOICE_LABEL[choice].toLowerCase()).join(" and ")}.`;

  return (
    <section className={styles.vote} aria-labelledby="month-vote">
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong id="month-vote" className={styles.heading}>
            What kind of month should {month} be?
          </strong>
          <span className={styles.small}>
            {summary} Counted {shortDate(view.countedOn)}.
            {mine ? ` You: ${CHOICE_LABEL[mine].toLowerCase()}.` : " You haven’t voted."}
          </span>
        </span>
        <span className={styles.chevron} aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <>
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
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}
        </>
      ) : null}
    </section>
  );
}
