import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { shortDate } from "@/lib/cycle/announcement";
import { computeChosenDate } from "@/lib/cycle/chosen-date";
import { daysInMonth } from "@/lib/cycle/dates";
import {
  announcedOuting,
  latestDoneOuting,
  openOuting,
} from "@/lib/cycle/month-view";
import { getDb } from "@/lib/db";
import { availability, draws, picks, type Outing } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import { Eyebrow } from "../frame";
import styles from "../page.module.css";
import { roster } from "./admin-actions";
import admin from "./admin.module.css";
import { Panel, type PanelOuting } from "./panel";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  if (!member.isAdmin) {
    return (
      <>
        <h1 className={styles.title}>Not for you</h1>
        <p className={styles.lede}>
          Only the Admin can add people or overrule the month.
        </p>
      </>
    );
  }

  // The settled dinner and the open month usually both exist; each gets its own
  // controls. With neither, the last dinner is shown so a reroll is still possible.
  const [announced, open] = await Promise.all([announcedOuting(), openOuting()]);
  const outings = [announced, open].filter((each): each is Outing => Boolean(each));
  if (outings.length === 0) {
    const done = await latestDoneOuting();
    if (done) outings.push(done);
  }

  const people = await roster();
  const panelOutings = await Promise.all(outings.map(describe));

  return (
    <>
      <Eyebrow text="Admin" />
      <h1 className={styles.title}>Admin</h1>
      <p className={admin.hint}>
        Anyone who taps your name gets this too, so keep the group link to the group.
      </p>
      <Panel secret={secret} people={people} outings={panelOutings} />
    </>
  );
}

async function describe(outing: Outing): Promise<PanelOuting> {
  const db = getDb();
  const [tapped, inTier, drawRows] = await Promise.all([
    db
      .select({ memberId: availability.memberId, day: availability.day })
      .from(availability)
      .where(eq(availability.outingId, outing.id)),
    db.select({ id: picks.id }).from(picks).where(eq(picks.tier, outing.tier)),
    db
      .select({ isReroll: draws.isReroll })
      .from(draws)
      .where(eq(draws.outingId, outing.id)),
  ]);

  return {
    id: outing.id,
    month: outing.month,
    tier: outing.tier,
    kind: outing.kind,
    status: outing.status,
    chosenDate: outing.chosenDate,
    booked: Boolean(outing.bookedAt),
    rerolled: drawRows.some((row) => row.isReroll),
    emptyTier: outing.kind !== "party" && inTier.length === 0,
    topDays: computeChosenDate(daysInMonth(outing.month), tapped).topDays.map(
      (tally) => ({ ...tally, label: shortDate(tally.day) }),
    ),
  };
}
