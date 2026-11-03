/**
 * The pure half of who is going and whether the table matches.
 *
 * Kept apart from the queries because the ticket's controls run in the browser.
 */

/** The Members bringing a guest who are themselves going. A guest needs a host. */
export function guestsGoing(
  going: readonly string[],
  plusOneHosts: readonly string[],
): string[] {
  const here = new Set(going);
  return plusOneHosts.filter((host) => here.has(host));
}

/** Everyone at the table: Members going plus the guests of those Members. */
export function headcount(
  going: readonly string[],
  plusOneHosts: readonly string[],
): number {
  return going.length + guestsGoing(going, plusOneHosts).length;
}

/**
 * Whether a booking still fits. `bookedFor` is the headcount the moment someone
 * marked it booked; `now` is the headcount as things stand.
 */
export function bookingFits(bookedFor: number | null, now: number): boolean {
  return bookedFor === null || bookedFor === now;
}

/**
 * How one Member stands on the Chosen Date, from the days they marked free.
 *
 * Going is Availability on that night. Can't is Availability on some other day
 * of the month and not that night. Hasn't answered is no Availability recorded
 * for the month at all. The ticket reads this same rule as the calendar.
 */
export type NightAnswer = "going" | "cant" | "unanswered";

export function memberOnDate(
  days: readonly string[],
  chosenDate: string,
): NightAnswer {
  if (days.length === 0) return "unanswered";
  if (days.includes(chosenDate)) return "going";
  return "cant";
}

/** One person on the ticket: filled, dashed, or grey, and maybe a guest. */
export type Seat = {
  id: string;
  name: string;
  answer: NightAnswer;
  plusOne: boolean;
};
