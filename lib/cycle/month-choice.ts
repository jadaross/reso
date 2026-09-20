/**
 * The pure half of the Month Vote: the choices, how votes become a decision,
 * and which month is up for a vote today. Kept apart from the queries because
 * the vote buttons run in the browser and must not drag the database client in.
 */
import type { MonthChoice, OutingKind, PriceTier } from "@/lib/db/schema";

import { addMonths, monthOf, type DayString, type MonthString } from "./dates";
import { drawFrom } from "./draw";

export const CHOICES: readonly MonthChoice[] = ["low", "medium", "high", "party"];

export const CHOICE_LABEL: Record<MonthChoice, string> = {
  low: "Cheap",
  medium: "Middling",
  high: "Expensive",
  party: "Dinner party",
};

export type Decision = {
  kind: OutingKind;
  tier: PriceTier;
  /**
   * rota     — nobody voted, so the Tier Rotation stands.
   * vote     — a clear winner.
   * tie-rota — a tie that the rota's own turn was part of, so it takes it.
   * tie-draw — a tie without the rota in it, settled the way everything else is.
   */
  how: "rota" | "vote" | "tie-rota" | "tie-draw";
  counts: Record<MonthChoice, number>;
};

/**
 * What kind of month the votes make it.
 *
 * The rota is the default, not a candidate: it only wins outright when nobody
 * has voted, or breaks a tie it happens to be part of. A dinner party keeps the
 * rota's tier underneath so the rotation is untouched for the month after.
 */
export function decideMonth(
  votes: readonly { choice: MonthChoice }[],
  rota: PriceTier,
  pick: <T>(candidates: readonly T[]) => T | null = drawFrom,
): Decision {
  const counts: Record<MonthChoice, number> = { low: 0, medium: 0, high: 0, party: 0 };
  for (const vote of votes) counts[vote.choice] += 1;

  const settle = (choice: MonthChoice, how: Decision["how"]): Decision =>
    choice === "party"
      ? { kind: "party", tier: rota, how, counts }
      : { kind: "restaurant", tier: choice, how, counts };

  if (votes.length === 0) return settle(rota, "rota");

  const top = Math.max(...CHOICES.map((choice) => counts[choice]));
  const tied = CHOICES.filter((choice) => counts[choice] === top);

  if (tied.length === 1) return settle(tied[0], "vote");
  if (tied.includes(rota)) return settle(rota, "tie-rota");
  return settle(pick(tied) ?? tied[0], "tie-draw");
}

/**
 * The month being voted on today: the one after next.
 *
 * Next month's Outing already exists (it opened on the 1st of this month), so the
 * first month whose kind is still up for grabs is the one after — and its vote is
 * counted on the 1st of next month, the moment its Outing is created.
 */
export function voteMonthFor(today: DayString): MonthString {
  return addMonths(monthOf(today), 2);
}

export type VoteView = {
  month: MonthString;
  mine: MonthChoice | null;
  /** Who has voted for what, by name. */
  byChoice: Record<MonthChoice, string[]>;
  /** What the rota would give this month if nobody voted. */
  rota: PriceTier;
  /** The day the vote is counted. */
  countedOn: DayString;
};
