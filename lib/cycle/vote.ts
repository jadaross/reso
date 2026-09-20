import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  members,
  monthVotes,
  outings,
  type MonthChoice,
  type PriceTier,
} from "@/lib/db/schema";

import { addMonths, type MonthString } from "./dates";
import type { VoteView } from "./month-choice";
import { tierForMonth } from "./tier";

/** The vote as it stands, for the month screen. */
export async function loadVote(
  month: MonthString,
  memberId: string,
  rota: PriceTier,
): Promise<VoteView> {
  const rows = await getDb()
    .select({ memberId: monthVotes.memberId, choice: monthVotes.choice, name: members.name })
    .from(monthVotes)
    .innerJoin(members, eq(members.id, monthVotes.memberId))
    .where(and(eq(monthVotes.month, month), isNull(members.archivedAt)));

  const byChoice: Record<MonthChoice, string[]> = { low: [], medium: [], high: [], party: [] };
  for (const row of rows) byChoice[row.choice].push(row.name);
  for (const names of Object.values(byChoice)) names.sort((a, b) => a.localeCompare(b, "en-GB"));

  return {
    month,
    mine: rows.find((row) => row.memberId === memberId)?.choice ?? null,
    byChoice,
    rota,
    countedOn: addMonths(month, -1),
  };
}

/** Cast, change or withdraw (null) a vote. One per Member per month. */
export async function castVote(
  memberId: string,
  month: MonthString,
  choice: MonthChoice | null,
): Promise<void> {
  const db = getDb();
  const mine = and(eq(monthVotes.month, month), eq(monthVotes.memberId, memberId));

  if (choice === null) {
    await db.delete(monthVotes).where(mine);
    return;
  }

  await db
    .insert(monthVotes)
    .values({ month, memberId, choice })
    .onConflictDoUpdate({
      target: [monthVotes.month, monthVotes.memberId],
      set: { choice },
    });
}

/** Every live Member's vote for a month, for the count. */
export async function votesFor(month: MonthString) {
  return getDb()
    .select({ choice: monthVotes.choice })
    .from(monthVotes)
    .innerJoin(members, eq(members.id, monthVotes.memberId))
    .where(and(eq(monthVotes.month, month), isNull(members.archivedAt)));
}

/** True once the month has an Outing — the vote has been counted. */
export async function isSettled(month: MonthString): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: outings.id })
    .from(outings)
    .where(eq(outings.month, month))
    .limit(1);
  return Boolean(row);
}

/** What the rota alone would make of a month, from the Group's first Outing. */
export async function rotaFor(month: MonthString): Promise<PriceTier> {
  const [first] = await getDb()
    .select({ month: outings.month })
    .from(outings)
    .orderBy(outings.month)
    .limit(1);
  return tierForMonth(month, first?.month ?? month);
}

export { CHOICES, CHOICE_LABEL, decideMonth, voteMonthFor } from "./month-choice";
export type { Decision, VoteView } from "./month-choice";
