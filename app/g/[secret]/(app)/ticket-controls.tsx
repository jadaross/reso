"use client";

import { useState, useTransition } from "react";

import { bookingFits } from "@/lib/cycle/booking";

import { markBooked, setGoing, setPlusOne, unmarkBooked } from "./going-actions";
import styles from "./reveal.module.css";

/**
 * The three things a person can do to a settled month: say whether they are
 * coming, say whether they are bringing someone, and say the table is booked.
 *
 * Each tap lands on screen at once and the server catches up behind it; the
 * page re-renders from the server when the action completes, so the headcount
 * on the ticket above follows a beat later.
 */
export function TicketControls({
  secret,
  outingId,
  party,
  myGoing,
  myPlusOne,
  bookedBy,
  bookedFor,
  heads,
}: {
  secret: string;
  outingId: string;
  party: boolean;
  myGoing: boolean;
  myPlusOne: boolean;
  bookedBy: string | null;
  bookedFor: number | null;
  heads: number;
}) {
  const [going, setGoingShown] = useState(myGoing);
  const [plusOne, setPlusOneShown] = useState(myPlusOne);
  const [booked, setBookedShown] = useState(Boolean(bookedBy));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(next: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await next();
      setError(result.ok ? null : (result.error ?? "That didn’t save."));
    });
  }

  const fits = bookingFits(bookedFor, heads);

  return (
    <div className={styles.controls}>
      <div className={styles.toggles}>
        <button
          type="button"
          aria-pressed={going}
          disabled={pending}
          className={going ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
          onClick={() => {
            const next = !going;
            setGoingShown(next);
            if (!next) setPlusOneShown(false);
            run(() => setGoing(secret, outingId, next));
          }}
        >
          {going ? "You’re going" : "Count me in"}
        </button>
        {going ? (
          <button
            type="button"
            aria-pressed={plusOne}
            disabled={pending}
            className={plusOne ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
            onClick={() => {
              const next = !plusOne;
              setPlusOneShown(next);
              run(() => setPlusOne(secret, outingId, next));
            }}
          >
            {plusOne ? "Bringing someone" : "Bringing someone?"}
          </button>
        ) : null}
      </div>

      {party ? null : booked ? (
        <div className={fits ? styles.bookedNote : `${styles.bookedNote} ${styles.bookedOff}`}>
          {fits
            ? `Booked for ${bookedFor ?? heads}.`
            : `Booked for ${bookedFor}, now ${heads}. ${bookedBy ?? "Whoever booked"} needs to tell them.`}
          <button
            type="button"
            className={styles.quiet}
            disabled={pending}
            onClick={() => {
              setBookedShown(false);
              run(() => unmarkBooked(secret, outingId));
            }}
          >
            not booked after all
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.book}
          disabled={pending}
          onClick={() => {
            setBookedShown(true);
            run(() => markBooked(secret, outingId));
          }}
        >
          I’ve booked it
        </button>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
