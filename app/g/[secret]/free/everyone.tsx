"use client";

import { useState } from "react";

import type { Everyone as EveryoneData } from "@/lib/cycle/advance";
import { monthName, readableDate } from "@/lib/cycle/announcement";
import { calendarGrid, monthOf } from "@/lib/cycle/dates";

import styles from "./free.module.css";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The calendar, read-only, with one dot per person.
 *
 * The dots are the people you have picked, in the order they appear in the
 * chips, lit when they can do that evening — so three-of-three reads at a glance
 * and so does which one is missing. A night everyone picked can do gets an amber
 * edge. Tapping a day names them; it changes nothing.
 */
export function Everyone({
  data,
  me,
  today,
}: {
  data: EveryoneData;
  me: string;
  today: string;
}) {
  const everyone = data.people.map((person) => person.id);
  const [picked, setPicked] = useState<string[]>(everyone);
  const [monthIndex, setMonthIndex] = useState(() =>
    Math.max(data.months.indexOf(monthOf(today)), 0),
  );
  const [day, setDay] = useState<string | null>(null);

  const month = data.months[monthIndex];
  const nameOf = new Map(data.people.map((person) => [person.id, person.name]));
  const all = picked.length === everyone.length;

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((each) => each !== id) : [...current, id],
    );
  }

  const freeOn = (which: string) => new Set(data.free[which] ?? []);

  return (
    <>
      <div className={styles.chips} role="group" aria-label="Whose evenings to show">
        <button
          type="button"
          className={all ? `${styles.chip} ${styles.chipAll} ${styles.chipOn}` : `${styles.chip} ${styles.chipAll}`}
          aria-pressed={all}
          onClick={() => setPicked(all ? [me] : everyone)}
        >
          Everyone
        </button>
        {data.people.map((person) => {
          const on = picked.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              aria-pressed={on}
              onClick={() => toggle(person.id)}
            >
              {person.id === me ? "You" : person.name}
            </button>
          );
        })}
      </div>

      <div className={styles.switch}>
        <h2 className={styles.month}>
          {monthName(month)}
          <span className={styles.year}>{month.slice(0, 4)}</span>
        </h2>
        <div className={styles.arrows}>
          <button
            type="button"
            aria-label="Previous month"
            disabled={monthIndex === 0}
            onClick={() => {
              setMonthIndex(monthIndex - 1);
              setDay(null);
            }}
          >
            &lsaquo;
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={monthIndex === data.months.length - 1}
            onClick={() => {
              setMonthIndex(monthIndex + 1);
              setDay(null);
            }}
          >
            &rsaquo;
          </button>
        </div>
      </div>

      <div className={styles.grid} role="group" aria-label={`${monthName(month)}, who is free`}>
        {DOW.map((letter, index) => (
          <div className={styles.dow} key={index} aria-hidden>
            {letter}
          </div>
        ))}
        {calendarGrid(month).map((each, index) => {
          if (each === null) return <div key={index} />;
          const free = freeOn(each);
          const lit = picked.filter((id) => free.has(id));
          const everyonePicked = picked.length > 0 && lit.length === picked.length;
          const past = each < today;
          const classes = [
            styles.day,
            everyonePicked ? styles.all : "",
            each === day ? styles.picked : "",
            past ? styles.past : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={each}
              type="button"
              className={classes}
              aria-pressed={each === day}
              aria-label={`${Number(each.slice(8))}, ${lit.length} of ${picked.length} free`}
              onClick={() => setDay(each === day ? null : each)}
            >
              <span className={styles.date}>{Number(each.slice(8))}</span>
              <span className={styles.dots} aria-hidden>
                {picked.map((id) => (
                  <i key={id} className={free.has(id) ? styles.lit : undefined} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {day ? <Detail day={day} free={freeOn(day)} picked={picked} nameOf={nameOf} me={me} /> : (
        <p className={styles.hint}>Tap a day to see who can do it.</p>
      )}
    </>
  );
}

function Detail({
  day,
  free,
  picked,
  nameOf,
  me,
}: {
  day: string;
  free: Set<string>;
  picked: string[];
  nameOf: Map<string, string>;
  me: string;
}) {
  const label = (id: string) => (id === me ? "You" : (nameOf.get(id) ?? "Someone"));
  const can = picked.filter((id) => free.has(id)).map(label);
  const cannot = picked.filter((id) => !free.has(id)).map(label);

  return (
    <div className={styles.detail} role="status">
      <strong>{readableDate(day)}</strong>
      {can.length === 0 ? (
        <span className={styles.cannot}>Nobody you picked has said yes to this one.</span>
      ) : (
        <>
          <span className={styles.can}>{can.join(", ")}</span>
          {cannot.length > 0 ? (
            <span className={styles.cannot}> &middot; not {cannot.join(", ")}</span>
          ) : (
            <span className={styles.cannot}>
              {" "}
              &middot; {picked.length === 1 ? "" : "all of them"}
            </span>
          )}
        </>
      )}
    </div>
  );
}
