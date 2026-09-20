"use client";

import { useRef, useState, useTransition } from "react";

import { monthName } from "@/lib/cycle/announcement";
import type { YearMonth } from "@/lib/cycle/advance";
import { calendarGrid } from "@/lib/cycle/dates";
import { daysOnWeekday } from "@/lib/cycle/year";

import styles from "./settings.module.css";
import { saveYearAction } from "./year-actions";

/** Monday first, matching the month calendar. Weekday numbers are Sunday-first. */
const DOW = [
  { letter: "M", name: "Monday", weekday: 1 },
  { letter: "T", name: "Tuesday", weekday: 2 },
  { letter: "W", name: "Wednesday", weekday: 3 },
  { letter: "T", name: "Thursday", weekday: 4 },
  { letter: "F", name: "Friday", weekday: 5 },
  { letter: "S", name: "Saturday", weekday: 6 },
  { letter: "S", name: "Sunday", weekday: 0 },
];

type Days = Record<string, string[]>;

/**
 * Twelve months of evenings, answered in batches.
 *
 * Three ways in, from coarse to fine: a weekday across the whole year ("every
 * Friday"), a weekday within one month (tap the letter above the grid), and a
 * single evening. Every tap lands on screen immediately; the months it touched
 * are marked dirty and sent together a moment later, as whole months, so that a
 * burst of taps becomes one request and out-of-order replies cannot undo a tap.
 */
export function Year({ secret, months }: { secret: string; months: YearMonth[] }) {
  const [days, setDays] = useState<Days>(() =>
    Object.fromEntries(months.map((each) => [each.month, each.days])),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // What the screen shows, what the server has confirmed, and what is in between.
  const latest = useRef(days);
  const committed = useRef(days);
  const dirty = useRef(new Set<string>());
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editable = new Set(
    months.filter((each) => each.state !== "settled").map((each) => each.month),
  );

  function apply(next: Days, touched: string[]) {
    latest.current = next;
    setDays(next);
    for (const month of touched) dirty.current.add(month);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  }

  function flush() {
    if (inFlight.current || dirty.current.size === 0) return;
    inFlight.current = true;
    const touched = [...dirty.current];
    dirty.current.clear();
    const changes = touched.map((month) => ({
      month,
      days: latest.current[month] ?? [],
    }));
    setStatus("saving");

    startTransition(async () => {
      const result = await saveYearAction(secret, changes);
      inFlight.current = false;

      if (result.ok) {
        committed.current = { ...committed.current };
        for (const change of changes) committed.current[change.month] = change.days;
        setStatus("saved");
        setError(null);
      } else {
        // Back to the last thing the server agreed to, dropping anything queued.
        latest.current = committed.current;
        dirty.current.clear();
        setDays(committed.current);
        setStatus("error");
        setError(result.error);
      }

      if (dirty.current.size > 0) flush();
    });
  }

  function set(month: string, update: (current: Set<string>) => Set<string>) {
    if (!editable.has(month)) return;
    const next = { ...latest.current, [month]: [...update(new Set(latest.current[month] ?? []))].sort() };
    apply(next, [month]);
  }

  function toggleDay(month: string, day: string) {
    set(month, (current) => {
      if (current.has(day)) current.delete(day);
      else current.add(day);
      return current;
    });
  }

  /** Every Friday in November: on if any are off, off once they all are. */
  function toggleWeekday(month: string, weekday: number) {
    const wanted = daysOnWeekday(month, weekday);
    set(month, (current) => {
      const all = wanted.every((day) => current.has(day));
      for (const day of wanted) {
        if (all) current.delete(day);
        else current.add(day);
      }
      return current;
    });
  }

  /** Every Friday all year, across every month that can still change. */
  function toggleWeekdayAcrossYear(weekday: number) {
    const targets = [...editable];
    const all = targets.every((month) =>
      daysOnWeekday(month, weekday).every((day) =>
        (latest.current[month] ?? []).includes(day),
      ),
    );
    const next = { ...latest.current };
    for (const month of targets) {
      const current = new Set(next[month] ?? []);
      for (const day of daysOnWeekday(month, weekday)) {
        if (all) current.delete(day);
        else current.add(day);
      }
      next[month] = [...current].sort();
    }
    apply(next, targets);
  }

  function clearMonth(month: string) {
    set(month, () => new Set());
  }

  const yearWide = DOW.map((dow) => ({
    ...dow,
    on:
      editable.size > 0 &&
      [...editable].every((month) =>
        daysOnWeekday(month, dow.weekday).every((day) =>
          (days[month] ?? []).includes(day),
        ),
      ),
  }));

  return (
    <>
      <div className={styles.batch} role="group" aria-label="Every week, all year">
        <span className={styles.batchLabel}>Every week</span>
        <div className={styles.chips}>
          {yearWide.map((dow) => (
            <button
              key={dow.weekday}
              type="button"
              aria-pressed={dow.on}
              aria-label={`Every ${dow.name}, all year`}
              className={dow.on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              onClick={() => toggleWeekdayAcrossYear(dow.weekday)}
            >
              {dow.name.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.status} role="status" aria-live="polite">
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved."
            : status === "error"
              ? (error ?? "Couldn't save.")
              : "Tap a day, or a letter for every one of that day in the month."}
      </p>

      {months.map((each) => {
        const mine = new Set(days[each.month] ?? []);
        const locked = each.state === "settled";
        return (
          <section key={each.month} className={styles.month} aria-label={monthName(each.month)}>
            <div className={styles.monthHead}>
              <h2 className={styles.monthName}>
                {monthName(each.month)}
                <span className={styles.year}>{each.month.slice(0, 4)}</span>
              </h2>
              {locked ? (
                <span className={styles.tag}>settled</span>
              ) : each.state === "open" ? (
                <span className={`${styles.tag} ${styles.tagOpen}`}>open now</span>
              ) : mine.size > 0 ? (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => clearMonth(each.month)}
                >
                  Clear
                </button>
              ) : null}
              {each.state === "open" && mine.size > 0 ? (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => clearMonth(each.month)}
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className={styles.grid}>
              {DOW.map((dow, index) => {
                const wanted = daysOnWeekday(each.month, dow.weekday);
                const all = wanted.every((day) => mine.has(day));
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={locked}
                    aria-pressed={all}
                    aria-label={`Every ${dow.name} in ${monthName(each.month)}`}
                    className={all ? `${styles.dow} ${styles.dowOn}` : styles.dow}
                    onClick={() => toggleWeekday(each.month, dow.weekday)}
                  >
                    {dow.letter}
                  </button>
                );
              })}
              {calendarGrid(each.month).map((day, index) => {
                if (day === null) return <div key={index} />;
                const on = mine.has(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={locked}
                    aria-pressed={on}
                    aria-label={`${Number(day.slice(8))} ${monthName(each.month)}`}
                    className={on ? `${styles.day} ${styles.on}` : styles.day}
                    onClick={() => toggleDay(each.month, day)}
                  >
                    {Number(day.slice(8))}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
