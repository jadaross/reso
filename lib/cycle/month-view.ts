import { and, asc, count, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { availability, members, outings, plusOnes } from "@/lib/db/schema";

import { computeChosenDate, type DayTally } from "./chosen-date";
import {
  calendarGrid,
  closeDayFor,
  daysInMonth,
  type DayString,
} from "./dates";

export type MonthView = {
  outingId: string;
  month: string;
  tier: "low" | "medium" | "high";
  status: "open" | "announced" | "done";
  closeDay: DayString;
  /** Calendar cells, Monday first, nulls for padding. */
  cells: (DayString | null)[];
  /** How many Members are free on each day. */
  freeByDay: Map<DayString, number>;
  /** The days this Member has tapped. */
  mine: Set<DayString>;
  myPlusOne: boolean;
  memberCount: number;
  /** Members who have tapped nothing at all. */
  silentCount: number;
  /** The best three days as things stand. */
  leaders: DayTally[];
};

/**
 * Everything the month screen needs, in one read.
 *
 * The tally is computed with the same `computeChosenDate` the Draw uses at Close
 * Day, so what a Member sees leading is what actually wins. Two implementations of
 * the tie-break would be two chances to disagree.
 */
export async function loadMonthView(
  outing: typeof outings.$inferSelect,
  memberId: string,
): Promise<MonthView> {
  const db = getDb();
  const month = outing.month;

  const [rows, mineRows, plusOne, [memberTally]] = await Promise.all([
    db
      .select({ memberId: availability.memberId, day: availability.day })
      .from(availability)
      .where(eq(availability.outingId, outing.id)),
    db
      .select({ day: availability.day })
      .from(availability)
      .where(
        and(
          eq(availability.outingId, outing.id),
          eq(availability.memberId, memberId),
        ),
      ),
    db
      .select({ memberId: plusOnes.memberId })
      .from(plusOnes)
      .where(
        and(eq(plusOnes.outingId, outing.id), eq(plusOnes.memberId, memberId)),
      )
      .limit(1),
    db
      .select({ total: count() })
      .from(members)
      .where(isNull(members.archivedAt)),
  ]);

  const freeByDay = new Map<DayString, number>();
  const answered = new Set<string>();
  for (const row of rows) {
    freeByDay.set(row.day, (freeByDay.get(row.day) ?? 0) + 1);
    answered.add(row.memberId);
  }

  const { topDays } = computeChosenDate(daysInMonth(month), rows);

  return {
    outingId: outing.id,
    month,
    tier: outing.tier,
    status: outing.status,
    closeDay: closeDayFor(month),
    cells: calendarGrid(month),
    freeByDay,
    mine: new Set(mineRows.map((row) => row.day)),
    myPlusOne: plusOne.length > 0,
    memberCount: memberTally?.total ?? 0,
    silentCount: Math.max((memberTally?.total ?? 0) - answered.size, 0),
    leaders: topDays,
  };
}

/**
 * The Outing currently taking Availability, or null between cycles.
 *
 * Ordered by month because more than one can be open at once: a month started by
 * hand for the group's first dinner sits alongside the next month the cron opened
 * on schedule. The soonest one is the one people are answering about.
 */
export async function openOuting() {
  const [outing] = await getDb()
    .select()
    .from(outings)
    .where(eq(outings.status, "open"))
    .orderBy(asc(outings.month))
    .limit(1);
  return outing ?? null;
}
