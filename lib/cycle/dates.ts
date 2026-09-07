/**
 * Calendar helpers for the monthly cycle.
 *
 * Dates are plain `YYYY-MM-DD` strings throughout, never `Date` objects. The Group
 * is in London and an Outing's days are whole days with dinner implied — no time of
 * day is ever meaningful — so carrying timestamps around would only invite a day to
 * slip either side of midnight when the server runs in UTC and London is on BST.
 */

export type DayString = string;
/** The first day of a month, `YYYY-MM-01`. Identifies an Outing. */
export type MonthString = string;

export const GROUP_TIME_ZONE = "Europe/London";

const londonFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: GROUP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today, as the Group experiences it. `en-CA` formats as `YYYY-MM-DD`. */
export function todayInLondon(now: Date = new Date()): DayString {
  return londonFormatter.format(now);
}

function parts(day: DayString): [number, number, number] {
  const [year, month, date] = day.split("-").map(Number);
  return [year, month, date];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthOf(day: DayString): MonthString {
  const [year, month] = parts(day);
  return `${year}-${pad(month)}-01`;
}

export function addMonths(month: MonthString, delta: number): MonthString {
  const [year, monthNumber] = parts(month);
  const zeroBased = monthNumber - 1 + delta;
  const targetYear = year + Math.floor(zeroBased / 12);
  const targetMonth = ((zeroBased % 12) + 12) % 12;
  return `${targetYear}-${pad(targetMonth + 1)}-01`;
}

export function daysInMonth(month: MonthString): DayString[] {
  const [year, monthNumber] = parts(month);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) => `${year}-${pad(monthNumber)}-${pad(index + 1)}`,
  );
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(day: DayString): number {
  const [year, month, date] = parts(day);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

export function isFridayOrSaturday(day: DayString): boolean {
  const weekday = weekdayOf(day);
  return weekday === 5 || weekday === 6;
}

/** An Outing opens on the 1st of the month before its own. */
export function openDayFor(month: MonthString): DayString {
  return addMonths(month, -1);
}

/** Close Day: the 15th of the month before the Outing. */
export function closeDayFor(month: MonthString): DayString {
  return `${addMonths(month, -1).slice(0, 7)}-15`;
}

/**
 * The month laid out as calendar cells, Monday first, with leading and trailing
 * blanks so the weeks line up under their headings.
 *
 * Monday first because the Group is British and a calendar that starts on Sunday
 * puts the weekend either side of the week, which is exactly the part they are
 * choosing between.
 */
export function calendarGrid(month: MonthString): (DayString | null)[] {
  const days = daysInMonth(month);
  // getUTCDay is Sunday-first; shift so Monday is 0.
  const lead = (weekdayOf(days[0]) + 6) % 7;

  const cells: (DayString | null)[] = Array<null>(lead).fill(null);
  cells.push(...days);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
