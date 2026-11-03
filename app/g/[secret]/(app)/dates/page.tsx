import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { shortDate } from "@/lib/cycle/announcement";
import { loadEveryone, loadYear } from "@/lib/cycle/advance";
import { closeDayFor, todayInLondon } from "@/lib/cycle/dates";
import { openOuting } from "@/lib/cycle/month-view";
import { pinLine } from "@/lib/cycle/override";
import { getDb } from "@/lib/db";
import { attendance, members, outings, picks, plusOnes } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Dates, type DatesMonth } from "./dates";

/**
 * Every calendar in one place: this month's dinner, the year ahead, and who
 * else is free when. One list of months, two ways of reading it — your own
 * evenings, which you tap, and everyone's, which you look at.
 */
export default async function DatesPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  const today = todayInLondon();
  const [months, everyone, open, pins] = await Promise.all([
    loadYear(member.id, today),
    loadEveryone(today),
    openOuting(),
    pinnedLines(),
  ]);
  const labelled = await withPlaces(months, member.id);

  return (
    <>
      <h1 className={styles.headline}>
        Dates
        {open ? (
          <span className={styles.headlineNote}>closes {shortDate(closeDayFor(open.month))}</span>
        ) : null}
      </h1>
      <Dates
        secret={secret}
        me={member.id}
        today={today}
        people={everyone.people}
        free={everyone.free}
        months={labelled.months}
        pins={pins}
        open={
          open
            ? {
                month: open.month,
                myPlusOne: labelled.plusMonths.has(open.month),
              }
            : null
        }
      />
    </>
  );
}

/**
 * The drawn place, and whether this Member went, for the months on screen.
 *
 * Going on an announced month is read from Availability in the client. A Visit
 * has already frozen attendance, so that one answer has to travel with the month.
 */
async function withPlaces(
  months: Awaited<ReturnType<typeof loadYear>>,
  memberId: string,
): Promise<{ months: DatesMonth[]; plusMonths: Set<string> }> {
  const monthKeys = months.map((each) => each.month);
  const db = getDb();
  const [labels, wentRows, plusRows] = await Promise.all([
    db
      .select({
        month: outings.month,
        kind: outings.kind,
        place: picks.name,
      })
      .from(outings)
      .leftJoin(picks, eq(picks.id, outings.drawnPickId))
      .where(inArray(outings.month, monthKeys)),
    db
      .select({ month: outings.month })
      .from(attendance)
      .innerJoin(outings, eq(outings.id, attendance.outingId))
      .where(and(eq(attendance.memberId, memberId), inArray(outings.month, monthKeys))),
    db
      .select({ month: outings.month })
      .from(plusOnes)
      .innerJoin(outings, eq(outings.id, plusOnes.outingId))
      .where(and(eq(plusOnes.memberId, memberId), inArray(outings.month, monthKeys))),
  ]);

  const went = new Set(wentRows.map((row) => row.month));
  const byMonth = new Map(labels.map((row) => [row.month, row]));

  return {
    plusMonths: new Set(plusRows.map((row) => row.month)),
    months: months.map((each) => {
      const label = byMonth.get(each.month);
      return {
        ...each,
        place: label?.kind === "party" ? "Dinner party" : (label?.place ?? null),
        went: went.has(each.month),
      };
    }),
  };
}

/** "<Admin> pinned <night>" for every month an Admin has pinned. */
async function pinnedLines(): Promise<Record<string, string>> {
  const rows = await getDb()
    .select({
      month: outings.month,
      chosenDate: outings.chosenDate,
      admin: members.name,
    })
    .from(outings)
    .leftJoin(members, eq(members.id, outings.chosenDatePinnedBy))
    .where(eq(outings.chosenDateOverridden, true));

  const lines: Record<string, string> = {};
  for (const row of rows) {
    if (!row.chosenDate) continue;
    lines[row.month] = pinLine(row.admin ?? "Admin", shortDate(row.chosenDate));
  }
  return lines;
}
