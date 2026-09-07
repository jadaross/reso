import type { PriceTier } from "@/lib/db/schema";

import { addMonths, type MonthString } from "./dates";

/** Tier Rotation: Low, Medium, High, repeating. */
export const TIER_ROTATION: readonly PriceTier[] = ["low", "medium", "high"];

/** The tier for the nth Outing, counting the first Outing ever as 0. */
export function tierForSequence(sequence: number): PriceTier {
  const index =
    ((sequence % TIER_ROTATION.length) + TIER_ROTATION.length) %
    TIER_ROTATION.length;
  return TIER_ROTATION[index];
}

/**
 * The tier an Outing gets by rotation, derived from how many months separate it
 * from the Group's first Outing.
 *
 * Counting months rather than counting rows matters: the rotation must not shift
 * if a month is ever skipped, and it must give the same answer for a month whether
 * that month is being created now or recomputed later.
 */
export function tierForMonth(
  month: MonthString,
  firstMonth: MonthString,
): PriceTier {
  let sequence = 0;
  let cursor = firstMonth;

  const direction = month >= firstMonth ? 1 : -1;
  while (cursor !== month) {
    cursor = addMonths(cursor, direction);
    sequence += direction;
  }

  return tierForSequence(sequence);
}
