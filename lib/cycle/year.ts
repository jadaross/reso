/**
 * The pure half of the year screen: which months it reaches and what counts as a
 * day in them. Kept apart from the queries because the screen itself runs in the
 * browser and must not drag the database client in with it.
 */
import {
  addMonths,
  daysInMonth,
  monthOf,
  weekdayOf,
  type DayString,
  type MonthString,
} from "./dates";

/** How far ahead the year screen reaches. */
export const MONTHS_AHEAD = 12;

/**
 * The months a Member can answer for in advance: next month onwards, a year of
 * them.
 *
 * Next month rather than this one, because this month's dinner was settled on the
 * 22nd of last month. Next month is either open now or about to be, and the eleven
 * after it have no Outing yet — those are the ones the year screen exists for.
 */
export function monthsAhead(
  today: DayString,
  count: number = MONTHS_AHEAD,
): MonthString[] {
  const first = addMonths(monthOf(today), 1);
  return Array.from({ length: count }, (_, index) => addMonths(first, index));
}

/** Every day of `month` that falls on `weekday` (0 = Sunday … 6 = Saturday). */
export function daysOnWeekday(month: MonthString, weekday: number): DayString[] {
  return daysInMonth(month).filter((day) => weekdayOf(day) === weekday);
}

/**
 * Keep only the days that are actually in `month`, deduplicated and in order.
 *
 * A client can send anything; the month it claims to be saving is the only thing
 * the server takes its word on, and even that is checked against the window above.
 */
export function daysWithin(month: MonthString, days: string[]): DayString[] {
  const allowed = new Set(daysInMonth(month));
  return [...new Set(days)].filter((day) => allowed.has(day)).sort();
}
