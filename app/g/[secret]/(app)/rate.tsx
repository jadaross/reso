"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { collapsedRatingLine } from "@/lib/cycle/rating";

import { rateVisit } from "./rating-actions";
import styles from "./rate.module.css";

/** Long enough to read, gone inside a couple of seconds. */
const SAVED_MS = 2000;

/**
 * The day after the dinner.
 *
 * One tap for the score and an optional line, because anything longer will not get
 * filled in on a Sunday morning. The note is what makes the history worth reading
 * a year later, so it is offered but never required.
 *
 * Once it has been saved the card is one line — the place, the stars, the note —
 * and a tap opens it again. "Saved." is only the moment after a save.
 */
export function Rate({
  secret,
  outingId,
  place,
  existing,
  compact = false,
}: {
  secret: string;
  outingId: string;
  place: string;
  existing: { score: number; note: string | null } | null;
  /** On a history row: no box, smaller stars, no prompt until tapped. */
  compact?: boolean;
}) {
  const [score, setScore] = useState(existing?.score ?? 0);
  const [note, setNote] = useState(existing?.note ?? "");
  const [editing, setEditing] = useState(existing == null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
  }, []);

  function flashSaved() {
    setFlash(true);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => {
      flashTimer.current = null;
      setFlash(false);
    }, SAVED_MS);
  }

  function submit(nextScore: number, nextNote: string) {
    if (pending) return;
    const trimmed = nextNote.trim().slice(0, 280);
    setScore(nextScore);
    setNote(trimmed);
    startTransition(async () => {
      const result = await rateVisit(secret, outingId, nextScore, trimmed);
      if (result.ok) {
        setError(null);
        setEditing(false);
        flashSaved();
      } else {
        setError(result.error ?? "That didn't save.");
      }
    });
  }

  const line = score > 0 ? collapsedRatingLine(place, score, note) : null;

  return (
    <div className={compact ? `${styles.rate} ${styles.compact}` : styles.rate}>
      {!editing && line ? (
        <div className={styles.collapsedRow}>
          <button
            type="button"
            className={styles.collapsed}
            onClick={() => {
              setFlash(false);
              setEditing(true);
            }}
          >
            {line.place} <span className={styles.marks}>{line.stars}</span>
            {line.quote ? ` · ${line.quote}` : null}
          </button>
          {flash ? (
            <p className={styles.saved} role="status">
              Saved.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {score === 0 ? (
            <p className={styles.prompt}>
              {compact ? "You were there. How was it?" : `How was ${place}?`}
            </p>
          ) : null}

          <div className={styles.stars} role="group" aria-label={`Rate ${place}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} out of 5`}
                aria-pressed={score === n}
                disabled={pending}
                className={n <= score ? `${styles.star} ${styles.on}` : styles.star}
                onClick={() => submit(n, note)}
              >
                ★
              </button>
            ))}
          </div>

          {score > 0 ? (
            <form
              className={styles.noteForm}
              onSubmit={(event) => {
                event.preventDefault();
                const field = event.currentTarget.elements.namedItem("note");
                const nextNote = field instanceof HTMLInputElement ? field.value : note;
                submit(score, nextNote);
              }}
            >
              <input
                className={styles.note}
                name="note"
                type="text"
                enterKeyHint="done"
                value={note}
                maxLength={280}
                placeholder="A line about it, if you like"
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  // Return submits this form, the same as the Save button, once.
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }}
                disabled={pending}
              />
              <button type="submit" disabled={pending}>
                Save
              </button>
            </form>
          ) : null}

          {flash ? (
            <p className={styles.saved} role="status">
              Saved.
            </p>
          ) : null}
        </>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
