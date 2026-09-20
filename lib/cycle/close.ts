import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  attendance,
  availability,
  draws,
  members,
  outings,
  picks,
} from "@/lib/db/schema";

import { seedFromAdvance } from "./advance";
import { computeChosenDate } from "./chosen-date";
import {
  addMonths,
  closeDayFor,
  daysInMonth,
  monthOf,
  todayInLondon,
  type DayString,
  type MonthString,
} from "./dates";
import { drawFrom } from "./draw";
import { tierForMonth } from "./tier";
import { decideMonth, votesFor } from "./vote";

/**
 * Create the Outing that opens today, if it does not exist yet.
 *
 * An Outing opens on the 1st of the month before its own, so the Outing being
 * opened is always next month's. Creating it is idempotent — `month` is unique, so
 * a double-firing cron cannot make two.
 */
export async function ensureOpenOuting(
  today: DayString = todayInLondon(),
): Promise<MonthString> {
  const db = getDb();
  const month = addMonths(monthOf(today), 1);

  const [firstOuting] = await db
    .select({ month: outings.month })
    .from(outings)
    .orderBy(asc(outings.month))
    .limit(1);

  // The Group's very first Outing starts the rotation at Low.
  const firstMonth = firstOuting?.month ?? month;

  // The vote on this month is counted here, once, as its Outing is born. The
  // rota is what it falls back to when nobody said anything.
  const decision = decideMonth(
    await votesFor(month),
    tierForMonth(month, firstMonth),
  );

  const created = await db
    .insert(outings)
    .values({
      month,
      tier: decision.tier,
      kind: decision.kind,
      tierOverridden: decision.how !== "rota",
      status: "open",
    })
    .onConflictDoNothing({ target: outings.month })
    .returning({ id: outings.id });

  // Anyone who answered for this month from the year screen is filled in from the
  // first moment it is open, so they are never nudged for dates they already gave.
  if (created.length > 0) {
    await seedFromAdvance(created[0].id, month);
  }

  return month;
}

export type CloseResult = {
  month: MonthString;
  chosenDate: DayString | null;
  count: number;
  quorumMet: boolean;
  drawnPickId: string | null;
  /** True when the tier had no Picks at all and the Draw could not run. */
  emptyTier: boolean;
};

/**
 * Run Close Day for every Outing that is due one: lock Availability, compute the
 * Chosen Date, and run the Draw.
 *
 * Idempotent by construction — the update only matches an Outing still `open`, so
 * a cron that fires twice closes nothing the second time.
 */
export async function closeDueOutings(
  today: DayString = todayInLondon(),
): Promise<CloseResult[]> {
  const db = getDb();

  const open = await db
    .select({
      id: outings.id,
      month: outings.month,
      tier: outings.tier,
      kind: outings.kind,
    })
    .from(outings)
    .where(eq(outings.status, "open"));

  const due = open.filter((outing) => closeDayFor(outing.month) <= today);
  const results: CloseResult[] = [];

  for (const outing of due) {
    // Availability only counts from Members who are still in the Group: removal
    // drops a Member out of the headcount on any open Outing.
    const tapped = await db
      .select({ memberId: availability.memberId, day: availability.day })
      .from(availability)
      .innerJoin(members, eq(members.id, availability.memberId))
      .where(and(eq(availability.outingId, outing.id), isNull(members.archivedAt)));

    const chosen = computeChosenDate(daysInMonth(outing.month), tapped);

    // A dinner party has no Draw: nobody's Pick is a ticket, and the empty-tier
    // warning below is not a warning at all.
    const candidates =
      outing.kind === "party"
        ? []
        : await db
            .select({ id: picks.id })
            .from(picks)
            .innerJoin(members, eq(members.id, picks.memberId))
            .where(eq(picks.tier, outing.tier));

    const drawn = drawFrom(candidates);

    // Claim the transition. If another run got here first this matches nothing.
    const claimed = await db
      .update(outings)
      .set({
        status: "announced",
        chosenDate: chosen.chosenDate,
        drawnPickId: drawn?.id ?? null,
        closedAt: new Date(),
      })
      .where(and(eq(outings.id, outing.id), eq(outings.status, "open")))
      .returning({ id: outings.id });

    if (claimed.length === 0) continue;

    if (drawn) {
      await db.insert(draws).values({
        outingId: outing.id,
        pickId: drawn.id,
        isReroll: false,
        candidateCount: candidates.length,
      });
    }

    // Who came is fixed here, not derived on the way out.
    //
    // Availability stays editable in principle and a Member can be archived later,
    // so reading "who was free on the Chosen Date" months afterwards would let the
    // record of a dinner quietly rewrite itself. The Admin can correct this list
    // until the Visit has been rated.
    if (chosen.chosenDate) {
      const going = tapped
        .filter((row) => row.day === chosen.chosenDate)
        .map((row) => row.memberId);

      if (going.length > 0) {
        await db
          .insert(attendance)
          .values(going.map((memberId) => ({ outingId: outing.id, memberId })))
          .onConflictDoNothing();
      }
    }

    results.push({
      month: outing.month,
      chosenDate: chosen.chosenDate,
      count: chosen.count,
      quorumMet: chosen.quorumMet,
      drawnPickId: drawn?.id ?? null,
      // OPEN DECISION: what the site should actually do when a tier has no Picks
      // is still fog on the wayfinder map. Closing with no Drawn Pick and
      // surfacing it is the smallest honest behaviour until that is settled — it
      // does not silently fall through to another tier.
      emptyTier: outing.kind !== "party" && candidates.length === 0,
    });
  }

  return results;
}

/** An announced Outing whose Chosen Date has passed becomes a Visit. */
export async function markPastOutingsDone(
  today: DayString = todayInLondon(),
): Promise<number> {
  const done = await getDb()
    .update(outings)
    .set({ status: "done" })
    .where(
      and(
        eq(outings.status, "announced"),
        sql`${outings.chosenDate} is not null`,
        lt(outings.chosenDate, today),
      ),
    )
    .returning({ id: outings.id });

  return done.length;
}
