"use server";

import { revalidatePath } from "next/cache";

import { todayInLondon } from "@/lib/cycle/dates";
import { castVote, CHOICES, isSettled, voteMonthFor } from "@/lib/cycle/vote";
import type { MonthChoice } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

export type VoteResult = { ok: true } | { ok: false; error: string };

/**
 * Cast, change or withdraw your vote on the month after next.
 *
 * The month is fixed by today's date rather than taken from the client, so the
 * only month anyone can ever vote on is the one whose Outing does not exist yet.
 */
export async function castVoteAction(
  secret: string,
  choice: MonthChoice | null,
): Promise<VoteResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Tap your name first." };

  if (choice !== null && !CHOICES.includes(choice)) {
    return { ok: false, error: "That is not one of the choices." };
  }

  const month = voteMonthFor(todayInLondon());
  if (await isSettled(month)) {
    return { ok: false, error: "That month has already been decided." };
  }

  await castVote(member.id, month, choice);
  revalidatePath(`/g/${secret}`);
  return { ok: true };
}
