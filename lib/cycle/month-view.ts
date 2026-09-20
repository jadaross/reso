import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  attendance,
  availability,
  draws,
  members,
  outings,
  picks,
  plusOnes,
  ratings,
} from "@/lib/db/schema";

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
  /** Who is free on each day, by name, so people can see who they'd be eating with. */
  whoByDay: Map<DayString, string[]>;
  /** The days this Member has tapped. */
  mine: Set<DayString>;
  myPlusOne: boolean;
  memberCount: number;
  /** Members who have tapped nothing at all. */
  silentCount: number;
  /** The same Members, by name. */
  silentNames: string[];
  /** Members who have tapped at least one evening, by name. */
  answeredNames: string[];
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

  const [rows, mineRows, plusOne, roster] = await Promise.all([
    // Joined to Members so the day can say who, and so an archived Member's
    // leftover taps count for nothing — the same rule Close Day applies.
    db
      .select({
        memberId: availability.memberId,
        day: availability.day,
        name: members.name,
      })
      .from(availability)
      .innerJoin(members, eq(members.id, availability.memberId))
      .where(and(eq(availability.outingId, outing.id), isNull(members.archivedAt))),
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
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(isNull(members.archivedAt))
      .orderBy(asc(members.name)),
  ]);

  const freeByDay = new Map<DayString, number>();
  const whoByDay = new Map<DayString, string[]>();
  const answered = new Set<string>();
  for (const row of rows) {
    freeByDay.set(row.day, (freeByDay.get(row.day) ?? 0) + 1);
    whoByDay.set(row.day, [...(whoByDay.get(row.day) ?? []), row.name]);
    answered.add(row.memberId);
  }
  for (const names of whoByDay.values()) names.sort(byName);

  const { topDays } = computeChosenDate(daysInMonth(month), rows);

  return {
    outingId: outing.id,
    month,
    tier: outing.tier,
    status: outing.status,
    closeDay: closeDayFor(month),
    cells: calendarGrid(month),
    freeByDay,
    whoByDay,
    mine: new Set(mineRows.map((row) => row.day)),
    myPlusOne: plusOne.length > 0,
    memberCount: roster.length,
    silentCount: Math.max(roster.length - answered.size, 0),
    silentNames: roster
      .filter((person) => !answered.has(person.id))
      .map((person) => person.name),
    answeredNames: roster
      .filter((person) => answered.has(person.id))
      .map((person) => person.name),
    leaders: topDays,
  };
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en-GB");
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

export type Reveal = {
  kind: "restaurant" | "party";
  place: string | null;
  area: string | null;
  address: string | null;
  chosenDate: DayString | null;
  tier: "low" | "medium" | "high";
  month: string;
  /** Everyone going, from Availability on the Chosen Date. */
  going: string[];
  plusOnes: number;
  /** How many tickets the drawn place held — why it won. */
  tickets: number;
  /** How many Picks were in the tier at all. */
  candidates: number;
  rerolled: boolean;
};

/** Everything the announced screen shows, in one read. */
export async function loadReveal(
  outing: typeof outings.$inferSelect,
): Promise<Reveal> {
  const db = getDb();

  const [drawn, attending, plusOneRows, drawRows] = await Promise.all([
    outing.drawnPickId
      ? db
          .select({ name: picks.name, address: picks.address, tier: picks.tier })
          .from(picks)
          .where(eq(picks.id, outing.drawnPickId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ name: members.name })
      .from(attendance)
      .innerJoin(members, eq(members.id, attendance.memberId))
      .where(eq(attendance.outingId, outing.id))
      .orderBy(asc(members.name)),
    db
      .select({ memberId: plusOnes.memberId })
      .from(plusOnes)
      .where(eq(plusOnes.outingId, outing.id)),
    db
      .select({ isReroll: draws.isReroll, candidateCount: draws.candidateCount })
      .from(draws)
      .where(eq(draws.outingId, outing.id))
      .orderBy(asc(draws.drawnAt)),
  ]);

  const place = drawn[0]?.name ?? null;

  // How many Picks share the drawn name: the tickets it held, and the reason it won.
  const tickets = place
    ? (
        await db
          .select({ id: picks.id })
          .from(picks)
          .where(and(eq(picks.name, place), eq(picks.tier, outing.tier)))
      ).length
    : 0;

  return {
    kind: outing.kind,
    place,
    area: null,
    address: drawn[0]?.address ?? null,
    chosenDate: outing.chosenDate,
    tier: outing.tier,
    month: outing.month,
    going: attending.map((row) => row.name),
    plusOnes: plusOneRows.length,
    tickets,
    candidates: drawRows.at(-1)?.candidateCount ?? 0,
    rerolled: drawRows.some((row) => row.isReroll),
  };
}

/** The Outing being shown when nothing is open: the most recent announced or done. */
export async function latestSettledOuting() {
  const [outing] = await getDb()
    .select()
    .from(outings)
    .where(inArray(outings.status, ["announced", "done"]))
    .orderBy(desc(outings.month))
    .limit(1);
  return outing ?? null;
}

export type VisitRow = {
  outingId: string;
  month: string;
  chosenDate: DayString | null;
  kind: "restaurant" | "party";
  place: string | null;
  address: string | null;
  tier: "low" | "medium" | "high";
  went: number;
  ratingCount: number;
  averageScore: number | null;
  notes: { who: string; score: number; note: string }[];
};

/**
 * Every Visit, newest first.
 *
 * Archived Members keep their attendance and their ratings: removing someone from
 * the Group takes their name out of circulation, it does not edit the record of
 * evenings they were at.
 */
export async function loadVisits(): Promise<VisitRow[]> {
  const db = getDb();

  const done = await db
    .select()
    .from(outings)
    .where(eq(outings.status, "done"))
    .orderBy(desc(outings.month));

  if (done.length === 0) return [];

  const ids = done.map((outing) => outing.id);

  const [attendanceRows, ratingRows, drawnPicks] = await Promise.all([
    db
      .select({ outingId: attendance.outingId })
      .from(attendance)
      .where(inArray(attendance.outingId, ids)),
    db
      .select({
        outingId: ratings.outingId,
        score: ratings.score,
        note: ratings.note,
        who: members.name,
      })
      .from(ratings)
      .innerJoin(members, eq(members.id, ratings.memberId))
      .where(inArray(ratings.outingId, ids)),
    db
      .select({ id: picks.id, name: picks.name, address: picks.address })
      .from(picks),
  ]);

  const pickById = new Map(drawnPicks.map((pick) => [pick.id, pick]));

  return done.map((outing) => {
    const mine = ratingRows.filter((row) => row.outingId === outing.id);
    const pick = outing.drawnPickId ? pickById.get(outing.drawnPickId) : undefined;

    return {
      outingId: outing.id,
      month: outing.month,
      chosenDate: outing.chosenDate,
      place: pick?.name ?? null,
      address: pick?.address ?? null,
      tier: outing.tier,
      went: attendanceRows.filter((row) => row.outingId === outing.id).length,
      ratingCount: mine.length,
      averageScore: mine.length
        ? mine.reduce((total, row) => total + row.score, 0) / mine.length
        : null,
      notes: mine
        .filter((row) => row.note)
        .map((row) => ({ who: row.who, score: row.score, note: row.note! })),
    };
  });
}

/** This Member's rating for an Outing, if they have given one. */
export async function myRating(outingId: string, memberId: string) {
  const [row] = await getDb()
    .select({ score: ratings.score, note: ratings.note })
    .from(ratings)
    .where(and(eq(ratings.outingId, outingId), eq(ratings.memberId, memberId)))
    .limit(1);
  return row ?? null;
}

/** True when this Member is down as having gone. */
export async function didAttend(outingId: string, memberId: string) {
  const [row] = await getDb()
    .select({ memberId: attendance.memberId })
    .from(attendance)
    .where(
      and(eq(attendance.outingId, outingId), eq(attendance.memberId, memberId)),
    )
    .limit(1);
  return Boolean(row);
}
