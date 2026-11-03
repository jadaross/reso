"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";

import {
  bookingFits,
  headcount,
  memberOnDate,
  type NightAnswer,
  type Seat,
} from "@/lib/cycle/booking";

import { markBooked, setGoing, setPlusOne } from "./going-actions";
import styles from "./reveal.module.css";

/**
 * The settled month, as far as a tap can change it: who is coming, whether you
 * are, whether you are bringing someone, and whether the table is booked.
 * Un-booking is not here: a mistaken "I've booked it" is undone from Admin, so
 * nobody can clear the booking with a stray tap on the home screen.
 *
 * A tap is drawn at once from the days this Member already marked. The server
 * writes the same Availability row the calendar uses, then the page catches up.
 */

type Snapshot = { days: string[]; bringing: boolean };

type NightContext = {
  seats: Seat[];
  heads: number;
  viewerId: string;
  answer: NightAnswer;
  plusOne: boolean;
  pending: boolean;
  error: string | null;
  party: boolean;
  over: boolean;
  bookedBy: string | null;
  bookedByMe: boolean;
  bookedFor: number | null;
  booked: boolean;
  go: () => void;
  cant: () => void;
  togglePlus: () => void;
  mark: () => void;
};

const Night = createContext<NightContext | null>(null);

function useNight(): NightContext {
  const value = useContext(Night);
  if (!value) throw new Error("Going controls rendered outside their provider");
  return value;
}

export function Going({
  secret,
  outingId,
  chosenDate,
  viewerId,
  viewerDays,
  seats,
  bookedBy,
  bookedByMe,
  bookedFor,
  party,
  over,
  children,
}: {
  secret: string;
  outingId: string;
  chosenDate: string;
  viewerId: string;
  viewerDays: string[];
  seats: Seat[];
  bookedBy: string | null;
  bookedByMe: boolean;
  bookedFor: number | null;
  party: boolean;
  over: boolean;
  children: ReactNode;
}) {
  const [days, setDays] = useState(viewerDays);
  const [bringing, setBringing] = useState(
    seats.some((seat) => seat.id === viewerId && seat.plusOne),
  );
  const [booked, setBooked] = useState(Boolean(bookedBy));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Before the dinner, the chip and the buttons follow the days marked free.
  // Afterwards the Visit is already frozen, and nothing here can move it.
  const answer: NightAnswer = over
    ? (seats.find((seat) => seat.id === viewerId)?.answer ?? "unanswered")
    : memberOnDate(days, chosenDate);
  const plusOne = answer === "going" && bringing;
  const live = over
    ? seats
    : seats.map((seat) =>
        seat.id === viewerId ? { ...seat, answer, plusOne } : seat,
      );
  const heads = headcount(
    live.filter((seat) => seat.answer === "going").map((seat) => seat.id),
    live.filter((seat) => seat.plusOne).map((seat) => seat.id),
  );

  function paint(nextDays: string[], nextBringing: boolean) {
    setDays(nextDays);
    setBringing(nextBringing);
  }

  function run(snapshot: Snapshot, action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setError(null);
        return;
      }
      setDays(snapshot.days);
      setBringing(snapshot.bringing);
      setError(result.error ?? "That didn’t save.");
    });
  }

  function go() {
    if (pending || over || answer === "going") return;
    const snapshot = { days, bringing };
    const nextDays = days.includes(chosenDate) ? days : [...days, chosenDate];
    paint(nextDays, bringing);
    run(snapshot, () => setGoing(secret, outingId, true));
  }

  function cant() {
    if (pending || over || answer === "cant") return;
    // No Availability at all is "hasn't answered", and neither button is lit.
    // Tapping Can't make it only means something once there is a night to drop.
    if (answer === "unanswered" && !bringing) return;
    const snapshot = { days, bringing };
    paint(
      days.filter((day) => day !== chosenDate),
      false,
    );
    run(snapshot, () => setGoing(secret, outingId, false));
  }

  function togglePlus() {
    if (pending || over || answer !== "going") return;
    const snapshot = { days, bringing };
    const next = !bringing;
    paint(days, next);
    run(snapshot, () => setPlusOne(secret, outingId, next));
  }

  function mark() {
    if (pending || over) return;
    setBooked(true);
    startTransition(async () => {
      const result = await markBooked(secret, outingId);
      if (result.ok) setError(null);
      else {
        setBooked(false);
        setError(result.error ?? "That didn’t save.");
      }
    });
  }

  return (
    <Night.Provider
      value={{
        seats: live,
        heads,
        viewerId,
        answer,
        plusOne,
        pending,
        error,
        party,
        over,
        bookedBy,
        bookedByMe,
        bookedFor,
        booked,
        go,
        cant,
        togglePlus,
        mark,
      }}
    >
      {children}
    </Night.Provider>
  );
}

/** The headcount on the ticket. Lives here so a tap changes it in the same paint. */
export function Headcount() {
  return <>{useNight().heads}</>;
}

function chipClass(seat: Seat, you: boolean): string {
  const tone =
    seat.answer === "going"
      ? styles.chipGoing
      : seat.answer === "cant"
        ? styles.chipCant
        : styles.chipSilent;
  return [styles.chip, tone, you ? styles.chipYou : ""].filter(Boolean).join(" ");
}

function chipLabel(seat: Seat, you: boolean): string {
  const who = you ? `${seat.name}, you` : seat.name;
  if (seat.answer === "going") {
    return seat.plusOne ? `${who}, going, bringing someone` : `${who}, going`;
  }
  if (seat.answer === "cant") return `${who}, can’t make it`;
  return `${who}, hasn’t answered`;
}

export function GoingPeople() {
  const night = useNight();
  const fits = bookingFits(night.bookedFor, night.heads);
  const tell = night.bookedByMe
    ? "You need"
    : `${night.bookedBy ?? "Whoever booked"} needs`;

  return (
    <>
      <ul className={styles.chips} aria-label="Who is going">
        {night.seats.map((seat) => {
          const you = seat.id === night.viewerId;
          return (
            <li key={seat.id} className={chipClass(seat, you)} aria-label={chipLabel(seat, you)}>
              {seat.name}
              {seat.plusOne ? <span className={styles.badge}>+1</span> : null}
            </li>
          );
        })}
      </ul>

      {!night.over && night.answer === "going" ? (
        <p className={styles.yours}>
          You’re going
          <span aria-hidden="true">·</span>
          <button
            type="button"
            aria-pressed={night.plusOne}
            disabled={night.pending}
            className={night.plusOne ? `${styles.bring} ${styles.bringOn}` : styles.bring}
            onClick={night.togglePlus}
          >
            {night.plusOne ? "Bringing someone" : "Bringing someone?"}
          </button>
        </p>
      ) : null}

      {night.over ? null : (
        <div className={styles.controls}>
          <div className={styles.toggles}>
            <button
              type="button"
              aria-pressed={night.answer === "going"}
              disabled={night.pending}
              className={
                night.answer === "going" ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle
              }
              onClick={night.go}
            >
              Going
            </button>
            <button
              type="button"
              aria-pressed={night.answer === "cant"}
              disabled={night.pending}
              className={
                night.answer === "cant" ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle
              }
              onClick={night.cant}
            >
              Can’t make it
            </button>
          </div>

          {night.party ? null : night.booked ? (
            <div className={fits ? styles.bookedNote : `${styles.bookedNote} ${styles.bookedOff}`}>
              {fits
                ? `Booked for ${night.bookedFor ?? night.heads}.`
                : `Booked for ${night.bookedFor}, now ${night.heads}. ${tell} to tell them.`}
            </div>
          ) : (
            <button
              type="button"
              className={styles.book}
              disabled={night.pending}
              onClick={night.mark}
            >
              I’ve booked it
            </button>
          )}

          {night.error ? <p className={styles.error}>{night.error}</p> : null}
        </div>
      )}
    </>
  );
}
