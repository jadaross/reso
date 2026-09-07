"use client";

import { useState, useTransition } from "react";

import { rateVisit } from "./rating-actions";
import styles from "./rate.module.css";

/**
 * The day after the dinner.
 *
 * One tap for the score and an optional line, because anything longer will not get
 * filled in on a Sunday morning. The note is what makes the history worth reading
 * a year later, so it is offered but never required.
 */
export function Rate({
  secret,
  outingId,
  place,
  existing,
}: {
  secret: string;
  outingId: string;
  place: string;
  existing: { score: number; note: string | null } | null;
}) {
  const [score, setScore] = useState(existing?.score ?? 0);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saved, setSaved] = useState(Boolean(existing));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(nextScore: number, nextNote: string) {
    startTransition(async () => {
      const result = await rateVisit(secret, outingId, nextScore, nextNote);
      if (result.ok) {
        setSaved(true);
        setError(null);
      } else {
        setError(result.error ?? "That didn't save.");
      }
    });
  }

  return (
    <div className={styles.rate}>
      <p className={styles.prompt}>
        {saved ? `You gave ${place}` : `How was ${place}?`}
      </p>

      <div className={styles.stars} role="group" aria-label={`Rate ${place}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} out of 5`}
            aria-pressed={score === n}
            disabled={pending}
            className={n <= score ? `${styles.star} ${styles.on}` : styles.star}
            onClick={() => {
              setScore(n);
              submit(n, note);
            }}
          >
            ★
          </button>
        ))}
      </div>

      {score > 0 ? (
        <form
          className={styles.noteForm}
          action={() => submit(score, note)}
        >
          <input
            className={styles.note}
            value={note}
            maxLength={280}
            placeholder="A line about it, if you like"
            onChange={(event) => setNote(event.target.value)}
            disabled={pending}
          />
          <button type="submit" disabled={pending}>
            Save
          </button>
        </form>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {saved && !error ? <p className={styles.saved}>Saved.</p> : null}
    </div>
  );
}
