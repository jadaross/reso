"use client";

import { useRef, useState, useTransition } from "react";

import type { YearMonth } from "@/lib/cycle/advance";
import {
  beyondLabel,
  goingMarkFor,
  leadHeadline,
  monthName,
  readableDate,
  settledFoldLine,
} from "@/lib/cycle/announcement";
import { tiedForLead } from "@/lib/cycle/chosen-date";
import { calendarGrid, daysInMonth } from "@/lib/cycle/dates";
import { daysOnWeekday, partitionDatesMonths } from "@/lib/cycle/year";

import { togglePlusOne } from "../availability-actions";
import { InTheRunning } from "../in-the-running";
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

export type DatesMonth = YearMonth & {
  /** Drawn place, or "Dinner party". Null when the month has no place yet. */
  place: string | null;
  /** True when this Member is on the Visit's attendance. Ignored until the month is done. */
  went: boolean;
};

export type DatesProps = {
  secret: string;
  me: string;
  today: string;
  people: { id: string; name: string }[];
  /** Who is free on each day, as Member ids, from everyone's answers. */
  free: Record<string, string[]>;
  months: DatesMonth[];
  /** "<Admin> pinned <night>", keyed by month, while a pin is in place. */
  pins: Record<string, string>;
  /** The month taking dates for the next dinner, if one is. */
  open: {
    month: string;
    myPlusOne: boolean;
  } | null;
};

/**
 * Dates opens on the month that is still taking Availability.
 *
 * The settled month above it is one line. Months after it are one line.
 * Taps land on screen at once; the months touched are sent together a moment
 * later, as whole months, so a burst of taps is one request and out-of-order
 * replies cannot undo one.
 */
export function Dates({ secret, me, today, people, free, months, pins, open }: DatesProps) {
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [plusOne, setPlusOne] = useState(open?.myPlusOne ?? false);

  const latest = useRef(days);
  const committed = useRef(days);
  const dirty = useRef(new Set<string>());
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editable = new Set(months.map((each) => each.month));
  const nameOf = new Map(people.map((person) => [person.id, person.name]));
  const order = mode === "who" ? picked : everyone;
  const parts = partitionDatesMonths(months, open?.month ?? null);

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

  function weekdayOn(month: string, weekday: number): boolean {
    const wanted = daysOnWeekday(month, weekday).filter((day) => day >= today);
    return wanted.length > 0 && wanted.every((day) => (days[month] ?? []).includes(day));
  }

  /** Everyone free on a day, with my own answer taken from the screen, not the server. */
  function freeOn(month: string, day: string): Set<string> {
    const ids = new Set(free[day] ?? []);
    if ((days[month] ?? []).includes(day)) ids.add(me);
    else ids.delete(me);
    return ids;
  }

  function toggleFold(key: string) {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  }

  function tallyMonth(month: string) {
    const candidateDays = daysInMonth(month);
    const entries: { memberId: string; day: string }[] = [];
    const answered = new Set<string>();
    for (const day of candidateDays) {
      for (const id of freeOn(month, day)) {
        entries.push({ memberId: id, day });
        answered.add(id);
      }
    }
    const leaders = tiedForLead(candidateDays, entries);
    const leader = leaders[0] ?? null;
    const namesOn = (day: string) =>
      people.filter((person) => freeOn(month, day).has(person.id)).map((person) => person.name);
    return {
      leaders,
      leader,
      names: leader ? namesOn(leader.day) : [],
      silent: people.filter((person) => !answered.has(person.id)),
      answeredNames: people
        .filter((person) => answered.has(person.id))
        .map((person) => person.name),
      whoByDay: new Map(leaders.map((tally) => [tally.day, namesOn(tally.day)])),
    };
  }

  const statusLine =
    status === "saving" || status === "error" ? (
      <p className={styles.status} role="status" aria-live="polite">
        {status === "saving" ? "Saving…" : (error ?? "Couldn’t save.")}
      </p>
    ) : null;

  const modeSwitch = (
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
  );

  const allPicked = picked.length === everyone.length;
  const whoFilters =
    mode === "who" ? (
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
    ) : null;

  function monthGrid(each: DatesMonth, leaderDay: string | null) {
    const mine = new Set(days[each.month] ?? []);
    const dinner = each.chosenDate;
    const looked = lookedAt && lookedAt.startsWith(each.month.slice(0, 7)) ? lookedAt : null;

    return (
      <div className={styles.monthBody}>
        {mode === "mine" ? (
          <div
            className={styles.batch}
            role="group"
            aria-label={`Every week in ${monthName(each.month)}`}
          >
            <span className={styles.batchLabel}>Every</span>
            <div className={styles.weekdayChips}>
              {DOW.map((dow) => {
                const on = weekdayOn(each.month, dow.weekday);
                return (
                  <button
                    key={dow.weekday}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Every ${dow.name} in ${monthName(each.month)}`}
                    className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                    onClick={() => toggleWeekday(each.month, dow.weekday)}
                  >
                    {dow.name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={styles.grid}>
          {DOW.map((dow) => {
            const on = weekdayOn(each.month, dow.weekday);
            return mode === "mine" ? (
              <button
                key={dow.weekday}
                type="button"
                aria-pressed={on}
                aria-label={`Every ${dow.name} in ${monthName(each.month)}`}
                className={on ? `${styles.dow} ${styles.dowOn}` : styles.dow}
                onClick={() => toggleWeekday(each.month, dow.weekday)}
              >
                {dow.letter}
              </button>
            ) : (
              <div key={dow.weekday} className={styles.dowStatic} aria-hidden>
                {dow.letter}
              </div>
            );
          })}
          {calendarGrid(each.month).map((day, index) => {
            if (day === null) return <div key={index} />;
            const on = mine.has(day);
            const ids = freeOn(each.month, day);
            const lit = order.filter((id) => ids.has(id));
            const freeCount = lit.length;
            const everyonePicked = mode === "who" && order.length > 0 && lit.length === order.length;
            const past = day < today;
            const classes = [
              styles.day,
              on ? styles.on : "",
              everyonePicked ? styles.all : "",
              day === looked ? styles.looked : "",
              past ? styles.past : "",
              day === dinner ? styles.dinner : "",
              day === leaderDay ? styles.leader : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={day}
                type="button"
                disabled={mode === "mine" && past}
                aria-pressed={mode === "mine" ? on : day === looked}
                aria-label={`${Number(day.slice(8))} ${monthName(each.month)}, ${freeCount} of ${order.length} free`}
                className={classes}
                onClick={() =>
                  mode === "mine" ? toggleDay(each.month, day) : setLookedAt(day === lookedAt ? null : day)
                }
              >
                <span className={styles.date}>{Number(day.slice(8))}</span>
                {freeCount > 0 ? <span className={styles.tally}>{freeCount}</span> : null}
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
      </div>
    );
  }

  function aheadSection(each: DatesMonth) {
    return (
      <section key={each.month} className={styles.month} aria-label={monthName(each.month)}>
        <h2 className={styles.monthName}>
          {monthName(each.month)}
          <span className={styles.year}>{each.month.slice(0, 4)}</span>
        </h2>
        {monthGrid(each, null)}
      </section>
    );
  }

  const openMonth = parts.current;
  const picture = openMonth ? tallyMonth(openMonth.month) : null;

  return (
    <>
      <div id="open-month" className={styles.opening}>
        {parts.before.map((each) => (
          <Fold
            key={each.month}
            line={settledFoldLine({
              month: each.month,
              chosenDate: each.chosenDate,
              place: each.place,
              going: goingMarkFor(
                days[each.month] ?? [],
                each.chosenDate,
                each.state === "done" ? "done" : "announced",
                each.went,
              ),
            })}
            expanded={expanded[each.month] ?? false}
            onToggle={() => toggleFold(each.month)}
          >
            {monthGrid(each, null)}
          </Fold>
        ))}

        {Object.entries(pins).map(([month, line]) => (
          <p key={month} className={styles.pin}>
            {line}
          </p>
        ))}

        {openMonth && picture ? (
          <section className={styles.month} aria-label={monthName(openMonth.month)}>
            <h2 className={styles.lead}>
              {picture.leader
                ? leadHeadline(
                    picture.leader.day,
                    picture.leader.count,
                    people.length,
                    picture.names,
                  )
                : monthName(openMonth.month)}
            </h2>
            {statusLine}
            {monthGrid(openMonth, picture.leader?.day ?? null)}
            {mode === "mine" && picture.silent.length > 0 ? (
              <ul className={styles.silent} aria-label="Haven't answered">
                {picture.silent.map((person) => (
                  <li key={person.id} className={styles.silentChip}>
                    {person.name}
                  </li>
                ))}
              </ul>
            ) : null}
            {modeSwitch}
            {whoFilters}
            {mode === "mine" ? (
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
            ) : null}
            <InTheRunning
              leaders={picture.leaders}
              whoByDay={picture.whoByDay}
              answered={picture.answeredNames}
              memberCount={people.length}
            />
          </section>
        ) : null}
      </div>

      {!openMonth ? (
        <>
          {modeSwitch}
          {whoFilters}
          {statusLine}
        </>
      ) : null}

      {openMonth && parts.after.length > 0 ? (
        <Fold
          line={beyondLabel(parts.after[0].month)}
          expanded={expanded.beyond ?? false}
          onToggle={() => toggleFold("beyond")}
        >
          {parts.after.map((each) => aheadSection(each))}
        </Fold>
      ) : (
        parts.after.map((each) => aheadSection(each))
      )}
    </>
  );
}

function Fold({
  line,
  expanded,
  onToggle,
  children,
}: {
  line: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.fold}>
      <button
        type="button"
        className={styles.foldLine}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className={styles.foldText}>{line}</span>
        <span
          className={expanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
          aria-hidden
        />
      </button>
      {expanded ? <div className={styles.foldBody}>{children}</div> : null}
    </div>
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
