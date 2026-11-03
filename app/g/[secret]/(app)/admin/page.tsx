import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import { shortDate } from "@/lib/cycle/announcement";
import { computeChosenDate } from "@/lib/cycle/chosen-date";
import { daysInMonth } from "@/lib/cycle/dates";
import { decideMonth } from "@/lib/cycle/month-choice";
import {
  announcedOuting,
  latestDoneOuting,
  openOuting,
} from "@/lib/cycle/month-view";
import { stablePick, tierBaseline, tierMark } from "@/lib/cycle/override";
import { rotaFor, votesFor } from "@/lib/cycle/vote";
import { getDb } from "@/lib/db";
import { availability, draws, members, picks, type Outing } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { roster } from "./admin-actions";
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

  const everyone = await roster();
  const people = everyone
    .filter((person) => person.archivedAt === null)
    .map(({ id, name, isAdmin, firstClaimedAt }) => ({
      id,
      name,
      isAdmin,
      firstClaimedAt,
    }));
  const archived = everyone
    .filter((person) => person.archivedAt !== null)
    .map(({ id, name }) => ({ id, name }));
  const panelOutings = await Promise.all(outings.map(describe));

  return (
    <>
      <h1 className={styles.title}>Admin</h1>
      <Panel
        secret={secret}
        people={people}
        archived={archived}
        outings={panelOutings}
      />
    </>
  );
}

async function describe(outing: Outing): Promise<PanelOuting> {
  const db = getDb();
  const [tapped, inTier, drawRows, drawn, votes, rota] = await Promise.all([
    db
      .select({ memberId: availability.memberId, day: availability.day })
      .from(availability)
      .innerJoin(members, eq(members.id, availability.memberId))
      .where(and(eq(availability.outingId, outing.id), isNull(members.archivedAt))),
    db.select({ id: picks.id }).from(picks).where(eq(picks.tier, outing.tier)),
    db
      .select({ isReroll: draws.isReroll })
      .from(draws)
      .where(eq(draws.outingId, outing.id)),
    outing.drawnPickId
      ? db
          .select({ name: picks.name })
          .from(picks)
          .where(eq(picks.id, outing.drawnPickId))
          .limit(1)
      : Promise.resolve([]),
    votesFor(outing.month),
    rotaFor(outing.month),
  ]);

  const computed = computeChosenDate(daysInMonth(outing.month), tapped);
  const decision = decideMonth(votes, rota, stablePick);
  const baseline = tierBaseline(
    decision.how,
    { kind: outing.kind, tier: outing.tier },
    decision,
    outing.tierOverridden,
  );

  const topDays = computed.topDays.map((tally) => ({
    ...tally,
    label: shortDate(tally.day),
  }));
  // A pinned night can fall out of the top three. Keep it tappable, or it cannot be undone.
  if (
    outing.chosenDateOverridden &&
    outing.chosenDate &&
    !topDays.some((day) => day.day === outing.chosenDate)
  ) {
    topDays.unshift({
      day: outing.chosenDate,
      count: new Set(
        tapped.filter((row) => row.day === outing.chosenDate).map((row) => row.memberId),
      ).size,
      label: shortDate(outing.chosenDate),
    });
  }

  return {
    id: outing.id,
    month: outing.month,
    tier: outing.tier,
    kind: outing.kind,
    status: outing.status,
    chosenDate: outing.chosenDate,
    chosenDateOverridden: outing.chosenDateOverridden,
    tierOverridden: outing.tierOverridden,
    baseline: {
      source: baseline.source,
      label: tierMark(baseline.kind, baseline.tier),
    },
    leader: computed.chosenDate ? shortDate(computed.chosenDate) : null,
    place: drawn[0]?.name ?? null,
    booked: Boolean(outing.bookedAt),
    rerolled: drawRows.some((row) => row.isReroll),
    emptyTier: outing.kind !== "party" && inTier.length === 0,
    topDays,
  };
}
