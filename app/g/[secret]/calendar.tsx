"use client";

import { useOptimistic, useTransition } from "react";

import { toggleDay, togglePlusOne } from "./availability-actions";
import styles from "./calendar.module.css";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export type CalendarProps = {
  secret: string;
  cells: (string | null)[];
  /** Days this Member has tapped. */
  mine: string[];
  /** How many Members are free on each day. */
  freeByDay: Record<string, number>;
  memberCount: number;
  myPlusOne: boolean;
  locked: boolean;
};

/**
 * The screen the group actually uses.
 *
 * Every tap is optimistic: the fill and the density bar move on the same frame as
 * the finger, and the server action reconciles behind it. On a phone on a bus, a
 * round trip before the day fills in reads as the tap not having registered, and
 * people tap again.
 */
export function Calendar({
  secret,
  cells,
  mine,
  freeByDay,
  memberCount,
  myPlusOne,
  locked,
}: CalendarProps) {
  const [, startTransition] = useTransition();

  const [days, setDays] = useOptimistic(
    new Set(mine),
    (current: Set<string>, day: string) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    },
  );

  const [plusOne, setPlusOne] = useOptimistic(
    myPlusOne,
    (current: boolean) => !current,
  );

  const tap = (day: string) => {
    if (locked) return;
    startTransition(async () => {
      setDays(day);
      await toggleDay(secret, day);
    });
  };

  return (
    <>
      <div className={styles.grid} role="group" aria-label="Evenings you are free">
        {DOW.map((letter, index) => (
          <div className={styles.dow} key={index} aria-hidden>
            {letter}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <div key={index} />;

          const mineToday = days.has(day);
          // The bar counts this Member optimistically too, so it never lags the fill.
          const others = (freeByDay[day] ?? 0) - (mine.includes(day) ? 1 : 0);
          const free = others + (mineToday ? 1 : 0);
          const date = Number(day.slice(8));

          return (
            <button
              key={day}
              type="button"
              onClick={() => tap(day)}
              disabled={locked}
              aria-pressed={mineToday}
              aria-label={`${date}, ${free} of ${memberCount} free`}
              className={`${styles.day} ${mineToday ? styles.on : ""}`}
            >
              <span className={styles.date}>{date}</span>
              <span className={styles.bars} aria-hidden>
                {Array.from({ length: memberCount }, (_, i) => (
                  <i key={i} className={i < free ? styles.filled : undefined} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={`${styles.plusOne} ${plusOne ? styles.plusOneOn : ""}`}
        aria-pressed={plusOne}
        disabled={locked}
        onClick={() =>
          startTransition(async () => {
            setPlusOne(true);
            await togglePlusOne(secret);
          })
        }
      >
        {plusOne ? "You're bringing someone" : "Bringing someone?"}
      </button>
    </>
  );
}
