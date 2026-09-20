import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { advanceAvailability, availability, members, outings } from "@/lib/db/schema";

import { addMonths, monthOf, type DayString, type MonthString } from "./dates";
import { daysWithin, monthsAhead } from "./year";

export type YearMonth = {
  month: MonthString;
  /**
   * open    — the Outing is taking Availability now; taps go straight to it.
   * settled — the Outing has closed; the days are shown but cannot change.
   * ahead   — no Outing yet; taps are kept as Advance Availability.
   */
  state: "open" | "settled" | "ahead";
  days: DayString[];
};

/** The year ahead for one Member: what they have said, month by month. */
export async function loadYear(
  memberId: string,
  today: DayString,
): Promise<YearMonth[]> {
  const db = getDb();
  const months = monthsAhead(today);
  const first = months[0];
  const end = addMonths(months[months.length - 1], 1);

  const existing = await db
    .select({ id: outings.id, month: outings.month, status: outings.status })
    .from(outings)
    .where(inArray(outings.month, months));

  const [tapped, ahead] = await Promise.all([
    existing.length > 0
      ? db
          .select({ outingId: availability.outingId, day: availability.day })
          .from(availability)
          .where(
            and(
              eq(availability.memberId, memberId),
              inArray(
                availability.outingId,
                existing.map((outing) => outing.id),
              ),
            ),
          )
      : Promise.resolve([]),
    db
      .select({ day: advanceAvailability.day })
      .from(advanceAvailability)
      .where(
        and(
          eq(advanceAvailability.memberId, memberId),
          gte(advanceAvailability.day, first),
          lt(advanceAvailability.day, end),
        ),
      ),
  ]);

  const outingByMonth = new Map(existing.map((outing) => [outing.month, outing]));

  return months.map((month) => {
    const outing = outingByMonth.get(month);
    if (outing) {
      return {
        month,
        state: outing.status === "open" ? "open" : "settled",
        days: tapped
          .filter((row) => row.outingId === outing.id)
          .map((row) => row.day)
          .sort(),
      };
    }
    return {
      month,
      state: "ahead",
      days: ahead
        .map((row) => row.day)
        .filter((day) => monthOf(day) === month)
        .sort(),
    };
  });
}

export type YearChange = { month: MonthString; days: string[] };

export type SaveYearResult = { ok: true } | { ok: false; error: string };

/**
 * Replace a Member's days for one or more months.
 *
 * Each month is a whole answer, not a toggle: the screen sends the full set it is
 * showing, so two taps arriving out of order cannot leave a day the Member never
 * chose. Months with an open Outing are written to that Outing's Availability, the
 * same rows the month screen reads; months with no Outing are kept as Advance
 * Availability until theirs opens.
 */
export async function saveYear(
  memberId: string,
  changes: YearChange[],
  today: DayString,
): Promise<SaveYearResult> {
  const db = getDb();
  const window = new Set(monthsAhead(today));

  for (const change of changes) {
    if (!window.has(change.month)) {
      return { ok: false, error: "That month is out of reach." };
    }
  }

  const existing = await db
    .select({ id: outings.id, month: outings.month, status: outings.status })
    .from(outings)
    .where(
      inArray(
        outings.month,
        changes.map((change) => change.month),
      ),
    );
  const outingByMonth = new Map(existing.map((outing) => [outing.month, outing]));

  for (const change of changes) {
    const days = daysWithin(change.month, change.days);
    const outing = outingByMonth.get(change.month);

    if (outing) {
      if (outing.status !== "open") {
        return { ok: false, error: "That month has already been settled." };
      }
      await db
        .delete(availability)
        .where(
          and(
            eq(availability.outingId, outing.id),
            eq(availability.memberId, memberId),
          ),
        );
      if (days.length > 0) {
        await db
          .insert(availability)
          .values(days.map((day) => ({ outingId: outing.id, memberId, day })))
          .onConflictDoNothing();
      }
      continue;
    }

    await db
      .delete(advanceAvailability)
      .where(
        and(
          eq(advanceAvailability.memberId, memberId),
          gte(advanceAvailability.day, change.month),
          lt(advanceAvailability.day, addMonths(change.month, 1)),
        ),
      );
    if (days.length > 0) {
      await db
        .insert(advanceAvailability)
        .values(days.map((day) => ({ memberId, day })))
        .onConflictDoNothing();
    }
  }

  return { ok: true };
}

/**
 * Carry Advance Availability into an Outing that has just opened.
 *
 * Only Members still in the Group are copied; an archived Member's advance rows
 * are simply dropped. Everything up to and including this month is then cleared —
 * Outings open in order, so anything older can never be seeded now.
 */
export async function seedFromAdvance(
  outingId: string,
  month: MonthString,
): Promise<number> {
  const db = getDb();
  const next = addMonths(month, 1);

  const rows = await db
    .select({
      memberId: advanceAvailability.memberId,
      day: advanceAvailability.day,
    })
    .from(advanceAvailability)
    .innerJoin(members, eq(members.id, advanceAvailability.memberId))
    .where(
      and(
        isNull(members.archivedAt),
        gte(advanceAvailability.day, month),
        lt(advanceAvailability.day, next),
      ),
    );

  if (rows.length > 0) {
    await db
      .insert(availability)
      .values(rows.map((row) => ({ outingId, memberId: row.memberId, day: row.day })))
      .onConflictDoNothing();
  }

  await db.delete(advanceAvailability).where(lt(advanceAvailability.day, next));

  return rows.length;
}

export type Everyone = {
  /** This month and the year after it, in order. */
  months: MonthString[];
  people: { id: string; name: string }[];
  /** Who is free on each day, as Member ids. Days nobody can do are absent. */
  free: Record<DayString, string[]>;
};

/**
 * Everyone's answers across the year ahead, for the Free tab.
 *
 * Months with an Outing read that Outing's Availability; months without one
 * read Advance Availability. Together they are every day anyone has said yes
 * to, which is what someone planning a birthday or a weekend away needs and the
 * month screen, being about one dinner, does not show.
 */
export async function loadEveryone(today: DayString): Promise<Everyone> {
  const db = getDb();
  const months = [monthOf(today), ...monthsAhead(today)];
  const first = months[0];
  const end = addMonths(months[months.length - 1], 1);

  const [people, existing] = await Promise.all([
    db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(isNull(members.archivedAt))
      .orderBy(members.name),
    db
      .select({ id: outings.id, month: outings.month })
      .from(outings)
      .where(inArray(outings.month, months)),
  ]);

  const live = new Set(people.map((person) => person.id));
  const withOuting = new Set(existing.map((outing) => outing.month));

  const [tapped, ahead] = await Promise.all([
    existing.length > 0
      ? db
          .select({ memberId: availability.memberId, day: availability.day })
          .from(availability)
          .where(
            inArray(
              availability.outingId,
              existing.map((outing) => outing.id),
            ),
          )
      : Promise.resolve([]),
    db
      .select({ memberId: advanceAvailability.memberId, day: advanceAvailability.day })
      .from(advanceAvailability)
      .where(and(gte(advanceAvailability.day, first), lt(advanceAvailability.day, end))),
  ]);

  const free: Record<DayString, string[]> = {};
  const add = (row: { memberId: string; day: DayString }) => {
    if (!live.has(row.memberId)) return;
    (free[row.day] ??= []).push(row.memberId);
  };
  for (const row of tapped) add(row);
  // An Outing's own rows are the answer for its month; advance rows for such a
  // month are leftovers and are not counted twice.
  for (const row of ahead) if (!withOuting.has(monthOf(row.day))) add(row);

  return { months, people, free };
}
