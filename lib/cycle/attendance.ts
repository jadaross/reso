import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { attendance, availability, members, outings } from "@/lib/db/schema";

type OutingRow = Pick<
  typeof outings.$inferSelect,
  "id" | "status" | "chosenDate"
>;

/**
 * Who is going, as Member ids and names.
 *
 * Until the dinner has happened, this is simply everyone free on the Chosen
 * Date — whatever route their tap took: the month calendar before Close Day,
 * the Dates tab or "Count me in" after it. One source, so the ticket can never
 * disagree with the calendar. Jada hit exactly that: Sophie tapped the dinner
 * night after the draw and the ticket did not list her.
 *
 * Once the dinner is done, the `attendance` rows are the record and nothing
 * rewrites them; they are frozen from this same answer the morning after.
 */
export async function goingMembers(
  outing: OutingRow,
): Promise<{ id: string; name: string }[]> {
  const db = getDb();

  if (outing.status !== "done" && outing.chosenDate) {
    return db
      .select({ id: members.id, name: members.name })
      .from(availability)
      .innerJoin(members, eq(members.id, availability.memberId))
      .where(
        and(
          eq(availability.outingId, outing.id),
          eq(availability.day, outing.chosenDate),
          isNull(members.archivedAt),
        ),
      )
      .orderBy(members.name);
  }

  return db
    .select({ id: members.id, name: members.name })
    .from(attendance)
    .innerJoin(members, eq(members.id, attendance.memberId))
    .where(eq(attendance.outingId, outing.id))
    .orderBy(members.name);
}

/** Freeze who went, from who was free on the night, as the Outing becomes a Visit. */
export async function freezeAttendance(outing: OutingRow): Promise<void> {
  const db = getDb();
  const going = await goingMembers({ ...outing, status: "announced" });
  await db.delete(attendance).where(eq(attendance.outingId, outing.id));
  if (going.length > 0) {
    await db
      .insert(attendance)
      .values(going.map((row) => ({ outingId: outing.id, memberId: row.id })))
      .onConflictDoNothing();
  }
}
