import { isFridayOrSaturday, type DayString } from "./dates";

export type AvailabilityEntry = { memberId: string; day: DayString };

export type DayTally = { day: DayString; count: number };

export type ChosenDateResult = {
  /** The winning day, or null when nobody tapped anything at all. */
  chosenDate: DayString | null;
  /** How many Members are free on the winning day. */
  count: number;
  /** The best three days, for the Admin to override with. */
  topDays: DayTally[];
  /**
   * False when the best day has fewer than three Members. The site never cancels
   * on this; it shows the Admin the top days and lets them decide.
   */
  quorumMet: boolean;
};

export const QUORUM = 3;

/**
 * The day of the Outing's month that most Members can make.
 *
 * Ties break to a Friday or Saturday over a weekday, then to the earliest day. A
 * Member with no Availability recorded has no rows here and so counts as
 * unavailable all month, which falls out of the tally rather than needing a case.
 */
export function computeChosenDate(
  candidateDays: DayString[],
  availability: AvailabilityEntry[],
): ChosenDateResult {
  const tallies = rankDays(candidateDays, availability);
  const best = tallies[0];
  return {
    chosenDate: best?.day ?? null,
    count: best?.count ?? 0,
    topDays: tallies.slice(0, 3),
    quorumMet: (best?.count ?? 0) >= QUORUM,
  };
}

/**
 * Every night tied for the most Members, in the order Close Day would break
 * the tie. The first is the night that leads. The rest are still in the
 * running — a four-way tie is four nights, not the three an Admin is offered.
 */
export function tiedForLead(
  candidateDays: DayString[],
  availability: AvailabilityEntry[],
): DayTally[] {
  const tallies = rankDays(candidateDays, availability);
  const best = tallies[0];
  if (!best) return [];
  return tallies.filter((tally) => tally.count === best.count);
}

function rankDays(
  candidateDays: DayString[],
  availability: AvailabilityEntry[],
): DayTally[] {
  const allowed = new Set(candidateDays);
  const byDay = new Map<DayString, Set<string>>();

  for (const entry of availability) {
    if (!allowed.has(entry.day)) continue;
    let members = byDay.get(entry.day);
    if (!members) {
      members = new Set();
      byDay.set(entry.day, members);
    }
    members.add(entry.memberId);
  }

  const tallies: DayTally[] = candidateDays
    .map((day) => ({ day, count: byDay.get(day)?.size ?? 0 }))
    .filter((tally) => tally.count > 0);

  tallies.sort(compareDays);
  return tallies;
}

function compareDays(a: DayTally, b: DayTally): number {
  if (a.count !== b.count) return b.count - a.count;

  const aWeekend = isFridayOrSaturday(a.day);
  const bWeekend = isFridayOrSaturday(b.day);
  if (aWeekend !== bWeekend) return aWeekend ? -1 : 1;

  // `YYYY-MM-DD` sorts lexicographically the same as chronologically.
  return a.day < b.day ? -1 : 1;
}
