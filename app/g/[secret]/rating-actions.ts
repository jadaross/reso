"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { attendance, ratings } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

/**
 * Rate a Visit.
 *
 * Only people recorded as attending can rate it, which is the one rule here: a
 * rating is a record of an evening someone was at, not an opinion poll. Re-rating
 * replaces the earlier score rather than adding a second.
 */
export async function rateVisit(
  secret: string,
  outingId: string,
  score: number,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Pick your name first." };

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return { ok: false, error: "Give it one to five." };
  }

  const db = getDb();
  const [went] = await db
    .select({ memberId: attendance.memberId })
    .from(attendance)
    .where(
      and(
        eq(attendance.outingId, outingId),
        eq(attendance.memberId, member.id),
      ),
    )
    .limit(1);

  if (!went) return { ok: false, error: "You weren't down as going to this one." };

  const trimmed = note.trim().slice(0, 280);

  await db
    .insert(ratings)
    .values({ outingId, memberId: member.id, score, note: trimmed || null })
    .onConflictDoUpdate({
      target: [ratings.outingId, ratings.memberId],
      set: { score, note: trimmed || null },
    });

  revalidatePath(`/g/${secret}`);
  revalidatePath(`/g/${secret}/history`);
  return { ok: true };
}
