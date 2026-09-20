"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { availability, plusOnes } from "@/lib/db/schema";
import { openOuting } from "@/lib/cycle/month-view";
import { currentMember } from "@/lib/identity/guard";

/**
 * Toggle one evening for the signed-in Member.
 *
 * Whole days only: dinner is implied and there is no time to choose. Writes go
 * straight through on every tap rather than being batched behind a save button,
 * because the screen is opened for fifteen seconds on a phone and a save button is
 * one more thing to forget.
 */
export async function toggleDay(secret: string, day: string): Promise<void> {
  const member = await currentMember();
  if (!member) return;

  const outing = await openOuting();
  // Availability is frozen once the Outing has closed; the tap is simply ignored.
  if (!outing || outing.status !== "open") return;

  const db = getDb();
  const where = and(
    eq(availability.outingId, outing.id),
    eq(availability.memberId, member.id),
    eq(availability.day, day),
  );

  const [existing] = await db
    .select({ day: availability.day })
    .from(availability)
    .where(where)
    .limit(1);

  if (existing) {
    await db.delete(availability).where(where);
  } else {
    await db
      .insert(availability)
      .values({ outingId: outing.id, memberId: member.id, day })
      .onConflictDoNothing();
  }

  revalidatePath(`/g/${secret}`);
}

/** Say whether you are bringing someone, for this Outing only. */
export async function togglePlusOne(secret: string): Promise<void> {
  const member = await currentMember();
  if (!member) return;

  const outing = await openOuting();
  if (!outing || outing.status !== "open") return;

  const db = getDb();
  const where = and(
    eq(plusOnes.outingId, outing.id),
    eq(plusOnes.memberId, member.id),
  );

  const [existing] = await db
    .select({ memberId: plusOnes.memberId })
    .from(plusOnes)
    .where(where)
    .limit(1);

  if (existing) {
    await db.delete(plusOnes).where(where);
  } else {
    await db
      .insert(plusOnes)
      .values({ outingId: outing.id, memberId: member.id })
      .onConflictDoNothing();
  }

  revalidatePath(`/g/${secret}`);
}
