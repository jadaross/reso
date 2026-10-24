import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { availability, members, picks, type PriceTier } from "@/lib/db/schema";

import type { DayString } from "./dates";

export type Candidate = { id: string; memberId: string };

/**
 * Ticket 18: the Draw is built from the Picks of people who can actually come.
 *
 * Every Pick in the tier is a ticket, but only the tickets of Members free on
 * the Chosen Date go in — so nobody loses the restaurant they picked to a night
 * they had already ruled out. If that leaves nothing (the only people free that
 * night added nothing in this tier), the whole tier is used instead: Jada's
 * call, better a place than no place. `narrowed` says which happened.
 */
export function narrowToFree(
  inTier: readonly Candidate[],
  freeMemberIds: ReadonlySet<string>,
): { candidates: Candidate[]; narrowed: boolean } {
  const free = inTier.filter((pick) => freeMemberIds.has(pick.memberId));
  if (free.length > 0) return { candidates: free, narrowed: true };
  return { candidates: [...inTier], narrowed: false };
}

/**
 * The pool one Outing draws from, as things stand: the tier's Picks, narrowed
 * to Members free on `chosenDate` when there is one. The single answer to
 * "what is in this month's draw", shared by Close Day, the reroll, the empty-tier
 * warning and the nudge, so none of them can disagree.
 */
export async function drawPoolFor(
  outingId: string,
  tier: PriceTier,
  chosenDate: DayString | null,
  options: { exclude?: string | null } = {},
): Promise<{ candidates: Candidate[]; inTier: number; narrowed: boolean }> {
  const db = getDb();

  const inTier = (
    await db
      .select({ id: picks.id, memberId: picks.memberId })
      .from(picks)
      .innerJoin(members, eq(members.id, picks.memberId))
      .where(eq(picks.tier, tier))
  ).filter((pick) => pick.id !== options.exclude);

  if (!chosenDate) {
    return { candidates: inTier, inTier: inTier.length, narrowed: false };
  }

  const free = await db
    .select({ memberId: availability.memberId })
    .from(availability)
    .innerJoin(members, eq(members.id, availability.memberId))
    .where(
      and(
        eq(availability.outingId, outingId),
        eq(availability.day, chosenDate),
        isNull(members.archivedAt),
        inArray(
          availability.memberId,
          inTier.length > 0 ? inTier.map((pick) => pick.memberId) : ["00000000-0000-0000-0000-000000000000"],
        ),
      ),
    );

  const result = narrowToFree(inTier, new Set(free.map((row) => row.memberId)));
  return { ...result, inTier: inTier.length };
}
