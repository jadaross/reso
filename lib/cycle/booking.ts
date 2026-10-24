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
