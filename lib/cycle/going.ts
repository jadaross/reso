import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { attendance, availability, outings, picks, plusOnes } from "@/lib/db/schema";

import { goingMembers } from "./attendance";
import { bookingFits, headcount } from "./booking";
import { pushToMembers } from "./messages";

type SettledOuting = typeof outings.$inferSelect;

/**
 * Put a Member on, or take them off, the Visit's attendance.
 *
 * This is the record frozen the morning after. Until then the ticket and the
 * Dates fold do not read it — they read Availability on the Chosen Date.
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

/**
 * Say whether a Member is coming to a settled Outing.
 *
 * Going adds the Chosen Date to their Availability. Can't drops only that
 * night, and the Plus-one with it, and leaves every other day they marked.
 * The ticket's buttons and the Dates fold both read that Availability.
 * Dinner's Going and Can't make it call this. The calendar writes the same
 * Availability when the Chosen Date is toggled.
 */
export async function setMemberGoing(
  outing: SettledOuting,
  memberId: string,
  going: boolean,
): Promise<void> {
  const db = getDb();
  await setAttendance(outing, memberId, going);

  if (outing.chosenDate) {
    if (going) {
      await db
        .insert(availability)
        .values({ outingId: outing.id, memberId, day: outing.chosenDate })
        .onConflictDoNothing();
    } else {
      await db.delete(availability).where(
        and(
          eq(availability.outingId, outing.id),
          eq(availability.memberId, memberId),
          eq(availability.day, outing.chosenDate),
        ),
      );
    }
  }

  if (!going) {
    await db
      .delete(plusOnes)
      .where(and(eq(plusOnes.outingId, outing.id), eq(plusOnes.memberId, memberId)));
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
