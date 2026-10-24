"use client";

import { useRef, useState, useTransition } from "react";

import type { YearMonth } from "@/lib/cycle/advance";
import { monthName, readableDate, shortDate } from "@/lib/cycle/announcement";
import { calendarGrid } from "@/lib/cycle/dates";
import { daysOnWeekday } from "@/lib/cycle/year";

import { togglePlusOne } from "../availability-actions";
import styles from "./dates.module.css";
import { saveDatesAction } from "./dates-actions";

/** Monday first. Weekday numbers are Sunday-first. */
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
type Mode = "mine" | "who";

export type DatesProps = {
  secret: string;
  me: string;
  today: string;
  people: { id: string; name: string }[];
  /** Who is free on each day, as Member ids, from everyone's answers. */
  free: Record<string, string[]>;
  months: YearMonth[];
  /** The month taking dates for the next dinner, if one is. */
  open: {
    month: string;
    closeDay: string;
    myPlusOne: boolean;
    standing: string;
    running: React.ReactNode;
  } | null;
};

/**
 * One list of months, two modes.
 *
 * "Your dates": tap an evening to say you can do it. Taps land on screen at
 * once; the months touched are sent together a moment later, as whole months,
 * so a burst of taps is one request and out-of-order replies cannot undo one.
 * The dots under each day are everyone, with your own dot following your tap.
 *
 * "Who's free": the same months, read-only, with the dots for the people you
 * pick. Tapping a day names them. Nothing here changes anyone's answers.
 */
export function Dates({ secret, me, today, people, free, months, open }: DatesProps) {
  const [mode, setMode] = useState<Mode>("mine");
  const [days, setDays] = useState<Days>(() =>
    Object.fromEntries(months.map((each) => [each.month, each.days])),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const everyone = people.map((person) => person.id);
  const [picked, setPicked] = useState<string[]>(everyone);
  const [lookedAt, setLookedAt] = useState<string | null>(null);

  const [plusOne, setPlusOne] = useState(open?.myPlusOne ?? false);

  const latest = useRef(days);
  const committed = useRef(days);
  const dirty = useRef(new Set<string>());
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editable = new Set(months.map((each) => each.month));
  const nameOf = new Map(people.map((person) => [person.id, person.name]));
  const order = mode === "who" ? picked : everyone;

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
    const changes = touched.map((month) => ({ month, days: latest.current[month] ?? [] }));
    setStatus("saving");

    startTransition(async () => {
      const result = await saveDatesAction(secret, changes);
      inFlight.current = false;
      if (result.ok) {
        committed.current = { ...committed.current };
        for (const change of changes) committed.current[change.month] = change.days;
        setStatus("saved");
        setError(null);
      } else {
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
    const next = {
      ...latest.current,
      [month]: [...update(new Set(latest.current[month] ?? []))].sort(),
    };
    apply(next, [month]);
  }

  function toggleDay(month: string, day: string) {
    set(month, (current) => {
      if (current.has(day)) current.delete(day);
      else current.add(day);
      return current;
    });
  }

  function toggleWeekday(month: string, weekday: number) {
    const wanted = daysOnWeekday(month, weekday).filter((day) => day >= today);
    set(month, (current) => {
      const all = wanted.every((day) => current.has(day));
      for (const day of wanted) {
        if (all) current.delete(day);
        else current.add(day);
      }
      return current;
    });
  }

  function toggleWeekdayAcrossYear(weekday: number) {
    const targets = [...editable];
    const all = targets.every((month) =>
      daysOnWeekday(month, weekday)
        .filter((day) => day >= today)
        .every((day) => (latest.current[month] ?? []).includes(day)),
    );
    const next = { ...latest.current };
    for (const month of targets) {
      const current = new Set(next[month] ?? []);
      for (const day of daysOnWeekday(month, weekday).filter((each) => each >= today)) {
        if (all) current.delete(day);
        else current.add(day);
      }
      next[month] = [...current].sort();
    }
    apply(next, targets);
  }

  /** Everyone free on a day, with my own answer taken from the screen, not the server. */
  function freeOn(month: string, day: string): Set<string> {
    const ids = new Set(free[day] ?? []);
    if ((days[month] ?? []).includes(day)) ids.add(me);
    else ids.delete(me);
    return ids;
  }

  const yearWide = DOW.map((dow) => ({
    ...dow,
    on:
      editable.size > 0 &&
      [...editable].every((month) =>
        daysOnWeekday(month, dow.weekday)
          .filter((day) => day >= today)
          .every((day) => (days[month] ?? []).includes(day)),
      ),
  }));

  const shown = months;
  const allPicked = picked.length === everyone.length;

  return (
    <>
      <div className={styles.modes} role="tablist" aria-label="Which dates to show">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "mine"}
          className={mode === "mine" ? `${styles.mode} ${styles.modeOn}` : styles.mode}
          onClick={() => setMode("mine")}
        >
          Your dates
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "who"}
          className={mode === "who" ? `${styles.mode} ${styles.modeOn}` : styles.mode}
          onClick={() => setMode("who")}
        >
          Who&rsquo;s free
        </button>
      </div>

      {mode === "mine" ? (
        <>
          <div className={styles.batch} role="group" aria-label="Every week, all year">
            <span className={styles.batchLabel}>Every</span>
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
                  ? (error ?? "Couldn’t save.")
                  : "Tap the evenings you can do. A letter does the whole column."}
          </p>
        </>
      ) : (
        <div className={styles.chips} role="group" aria-label="Whose evenings to show">
          <button
            type="button"
            className={allPicked ? `${styles.chip} ${styles.chipOn}` : styles.chip}
            aria-pressed={allPicked}
            onClick={() => setPicked(allPicked ? [me] : everyone)}
          >
            Everyone
          </button>
          {people.map((person) => {
            const on = picked.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                aria-pressed={on}
                onClick={() =>
                  setPicked((current) =>
                    current.includes(person.id)
                      ? current.filter((each) => each !== person.id)
                      : [...current, person.id],
                  )
                }
              >
                {person.id === me ? "You" : person.name}
              </button>
            );
          })}
        </div>
      )}

      {shown.map((each) => {
        const mine = new Set(days[each.month] ?? []);
        const locked = mode === "who";
        const isOpen = open?.month === each.month;
        const dinner = each.chosenDate;
        const looked = lookedAt && lookedAt.startsWith(each.month.slice(0, 7)) ? lookedAt : null;

        return (
          <section key={each.month} className={styles.month} aria-label={monthName(each.month)}>
            <div className={styles.monthHead}>
              <h2 className={styles.monthName}>
                {monthName(each.month)}
                <span className={styles.year}>{each.month.slice(0, 4)}</span>
              </h2>
              {isOpen ? (
                <span className={styles.tagOpen}>
                  next dinner · closes {shortDate(open.closeDay)}
                </span>
              ) : dinner ? (
                <span className={styles.tag}>
                  dinner {shortDate(dinner)}
                  {each.state === "announced" ? " · tap it to say you\u2019re in" : ""}
                </span>
              ) : null}
            </div>

            <div className={styles.grid}>
              {DOW.map((dow, index) => {
                const wanted = daysOnWeekday(each.month, dow.weekday).filter((day) => day >= today);
                const all = wanted.length > 0 && wanted.every((day) => mine.has(day));
                return mode === "mine" ? (
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
                ) : (
                  <div key={index} className={styles.dowStatic} aria-hidden>
                    {dow.letter}
                  </div>
                );
              })}
              {calendarGrid(each.month).map((day, index) => {
                if (day === null) return <div key={index} />;
                const on = mode === "mine" && mine.has(day);
                const ids = freeOn(each.month, day);
                const lit = order.filter((id) => ids.has(id));
                const everyonePicked = mode === "who" && order.length > 0 && lit.length === order.length;
                const past = day < today;
                const classes = [
                  styles.day,
                  on ? styles.on : "",
                  everyonePicked ? styles.all : "",
                  day === looked ? styles.looked : "",
                  past ? styles.past : "",
                  day === dinner ? styles.dinner : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={mode === "mine" && (locked || past)}
                    aria-pressed={mode === "mine" ? on : day === looked}
                    aria-label={`${Number(day.slice(8))} ${monthName(each.month)}, ${lit.length} of ${order.length} free`}
                    className={classes}
                    onClick={() =>
                      mode === "mine"
                        ? toggleDay(each.month, day)
                        : setLookedAt(day === lookedAt ? null : day)
                    }
                  >
                    <span className={styles.date}>{Number(day.slice(8))}</span>
                    <span className={styles.dots} aria-hidden>
                      {order.map((id) => (
                        <i key={id} className={ids.has(id) ? styles.lit : undefined} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {mode === "who" && looked ? (
              <WhoCan
                day={looked}
                free={freeOn(each.month, looked)}
                picked={picked}
                nameOf={nameOf}
                me={me}
              />
            ) : null}

            {mode === "mine" && isOpen ? (
              <>
                <button
                  type="button"
                  className={`${styles.plusOne} ${plusOne ? styles.plusOneOn : ""}`}
                  aria-pressed={plusOne}
                  onClick={() => {
                    setPlusOne(!plusOne);
                    startTransition(async () => {
                      await togglePlusOne(secret);
                    });
                  }}
                >
                  {plusOne ? "You’re bringing someone" : "Bringing someone?"}
                </button>
                <p className={styles.standing}>{open.standing}</p>
                {open.running}
              </>
            ) : null}
          </section>
        );
      })}
    </>
  );
}

function WhoCan({
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
        <span className={styles.cannot}>Nobody you picked can do this one.</span>
      ) : (
        <>
          <span className={styles.can}>{can.join(", ")}</span>
          {cannot.length > 0 ? (
            <span className={styles.cannot}> &middot; not {cannot.join(", ")}</span>
          ) : null}
        </>
      )}
    </div>
  );
}
