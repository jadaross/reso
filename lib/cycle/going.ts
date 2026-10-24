import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { attendance, outings, picks, plusOnes } from "@/lib/db/schema";

import { goingMembers } from "./attendance";
import { bookingFits, headcount } from "./booking";
import { pushToMembers } from "./messages";

type SettledOuting = typeof outings.$inferSelect;

/**
 * Put a Member on, or take them off, a settled month's going-list.
 *
 * Shared by the ticket's "Count me in" and by tapping the dinner date on the
 * Dates tab, so the two can never disagree about what going means.
 */
export async function setAttendance(
  outing: SettledOuting,
  memberId: string,
  going: boolean,
): Promise<void> {
  const db = getDb();
  const mine = and(eq(attendance.outingId, outing.id), eq(attendance.memberId, memberId));
  if (going) {
    await db.insert(attendance).values({ outingId: outing.id, memberId }).onConflictDoNothing();
  } else {
    await db.delete(attendance).where(mine);
  }
}

/** Everyone at the table right now: Members going plus the guests of those Members. */
export async function currentHeadcount(outing: SettledOuting): Promise<number> {
  const [going, hosts] = await Promise.all([
    goingMembers(outing),
    getDb()
      .select({ memberId: plusOnes.memberId })
      .from(plusOnes)
      .where(eq(plusOnes.outingId, outing.id)),
  ]);
  return headcount(
    going.map((row) => row.id),
    hosts.map((row) => row.memberId),
  );
}

export async function placeOf(outingId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ name: picks.name })
    .from(outings)
    .innerJoin(picks, eq(picks.id, outings.drawnPickId))
    .where(eq(outings.id, outingId))
    .limit(1);
  return row?.name ?? null;
}

/**
 * If the table is already booked and the headcount has just moved away from
 * what it was booked for, the person who booked it is told at once — they are
 * the one who has to ring the restaurant.
 */
export async function tellBookerIfChanged(
  outing: SettledOuting,
  who: string,
): Promise<void> {
  if (!outing.bookedAt || !outing.bookedBy || outing.bookedFor === null) return;

  const now = await currentHeadcount(outing);
  if (bookingFits(outing.bookedFor, now)) return;

  const place = await placeOf(outing.id);
  await pushToMembers([outing.bookedBy], {
    title: `Now ${now} for ${place ?? "dinner"}`,
    body: `${who} changed their plans. The table is booked for ${outing.bookedFor}.`,
    tag: "booking",
  });
}
