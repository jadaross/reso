"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { shortDate } from "@/lib/cycle/announcement";
import { bookingFits, headcount } from "@/lib/cycle/booking";
import { everyoneIds, pushToMembers } from "@/lib/cycle/messages";
import { getDb } from "@/lib/db";
import {
  attendance,
  availability,
  members,
  outings,
  picks,
  plusOnes,
} from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

export type GoingResult = { ok: true; note?: string } | { ok: false; error: string };

/**
 * Change whether you are coming, after the month has been settled.
 *
 * Attendance is fixed at Close Day from Availability, but plans change in the
 * three weeks between the draw and the dinner, and the table has to be booked
 * for the right number. So until the night itself, anyone can say they can make
 * it after all, or that they can't. The Availability row for the Chosen Date is
 * kept in step so the Free tab tells the same story.
 */
export async function setGoing(
  secret: string,
  outingId: string,
  going: boolean,
): Promise<GoingResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Tap your name first." };

  const outing = await settledOuting(outingId);
  if (!outing) return { ok: false, error: "That month can't be changed now." };

  const db = getDb();
  const mine = and(
    eq(attendance.outingId, outingId),
    eq(attendance.memberId, member.id),
  );

  if (going) {
    await db
      .insert(attendance)
      .values({ outingId, memberId: member.id })
      .onConflictDoNothing();
    if (outing.chosenDate) {
      await db
        .insert(availability)
        .values({ outingId, memberId: member.id, day: outing.chosenDate })
        .onConflictDoNothing();
    }
  } else {
    await db.delete(attendance).where(mine);
    if (outing.chosenDate) {
      await db
        .delete(availability)
        .where(
          and(
            eq(availability.outingId, outingId),
            eq(availability.memberId, member.id),
            eq(availability.day, outing.chosenDate),
          ),
        );
    }
  }

  await tellBookerIfChanged(outing, member.name);
  refresh(secret);
  return { ok: true };
}

/** Say whether you are bringing someone to a settled month. */
export async function setPlusOne(
  secret: string,
  outingId: string,
  bringing: boolean,
): Promise<GoingResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Tap your name first." };

  const outing = await settledOuting(outingId);
  if (!outing) return { ok: false, error: "That month can't be changed now." };

  const db = getDb();
  const mine = and(eq(plusOnes.outingId, outingId), eq(plusOnes.memberId, member.id));

  if (bringing) {
    await db
      .insert(plusOnes)
      .values({ outingId, memberId: member.id })
      .onConflictDoNothing();
  } else {
    await db.delete(plusOnes).where(mine);
  }

  await tellBookerIfChanged(outing, member.name);
  refresh(secret);
  return { ok: true };
}

/**
 * Mark the table as booked, by whoever did it.
 *
 * The headcount at this moment is kept with the booking, so a later change to
 * who is coming shows up as "booked for 7, now 8" rather than quietly rewriting
 * what the restaurant was told. Everyone with notifications on hears.
 */
export async function markBooked(
  secret: string,
  outingId: string,
): Promise<GoingResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Tap your name first." };

  const outing = await settledOuting(outingId);
  if (!outing) return { ok: false, error: "That month can't be changed now." };
  if (outing.bookedAt) return { ok: true, note: "Already marked as booked." };

  const heads = await currentHeadcount(outingId);

  const claimed = await getDb()
    .update(outings)
    .set({ bookedAt: new Date(), bookedBy: member.id, bookedFor: heads })
    .where(and(eq(outings.id, outingId), isNull(outings.bookedAt)))
    .returning({ id: outings.id });

  if (claimed.length > 0) {
    const place = await placeOf(outingId);
    await pushToMembers(await everyoneIds(), {
      title: `${place ?? "The table"} is booked`,
      body: `${member.name} booked it${
        outing.chosenDate ? ` for ${shortDate(outing.chosenDate)}` : ""
      }, table for ${heads}.`,
      tag: "booking",
    });
  }

  refresh(secret);
  return { ok: true };
}

/** Undo a booking marked by mistake. */
export async function unmarkBooked(
  secret: string,
  outingId: string,
): Promise<GoingResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Tap your name first." };

  const outing = await settledOuting(outingId);
  if (!outing) return { ok: false, error: "That month can't be changed now." };

  await getDb()
    .update(outings)
    .set({ bookedAt: null, bookedBy: null, bookedFor: null })
    .where(eq(outings.id, outingId));

  refresh(secret);
  return { ok: true };
}

/** An Outing that is announced but has not happened, or null. */
async function settledOuting(outingId: string) {
  const [outing] = await getDb()
    .select()
    .from(outings)
    .where(and(eq(outings.id, outingId), eq(outings.status, "announced")))
    .limit(1);
  return outing ?? null;
}

async function currentHeadcount(outingId: string): Promise<number> {
  const db = getDb();
  const [going, hosts] = await Promise.all([
    db
      .select({ memberId: attendance.memberId })
      .from(attendance)
      .innerJoin(members, eq(members.id, attendance.memberId))
      .where(eq(attendance.outingId, outingId)),
    db
      .select({ memberId: plusOnes.memberId })
      .from(plusOnes)
      .where(eq(plusOnes.outingId, outingId)),
  ]);
  return headcount(
    going.map((row) => row.memberId),
    hosts.map((row) => row.memberId),
  );
}

async function placeOf(outingId: string): Promise<string | null> {
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
async function tellBookerIfChanged(
  outing: typeof outings.$inferSelect,
  who: string,
): Promise<void> {
  if (!outing.bookedAt || !outing.bookedBy || outing.bookedFor === null) return;

  const now = await currentHeadcount(outing.id);
  if (bookingFits(outing.bookedFor, now)) return;

  const place = await placeOf(outing.id);
  await pushToMembers([outing.bookedBy], {
    title: `Now ${now} for ${place ?? "dinner"}`,
    body: `${who} changed their plans. The table is booked for ${outing.bookedFor}.`,
    tag: "booking",
  });
}

function refresh(secret: string) {
  revalidatePath(`/g/${secret}`);
  revalidatePath(`/g/${secret}/free`);
  revalidatePath(`/g/${secret}/admin`);
}
