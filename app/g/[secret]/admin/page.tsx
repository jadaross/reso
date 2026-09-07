import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { shortDate } from "@/lib/cycle/announcement";
import { computeChosenDate } from "@/lib/cycle/chosen-date";
import { daysInMonth } from "@/lib/cycle/dates";
import { latestSettledOuting, openOuting } from "@/lib/cycle/month-view";
import { getDb } from "@/lib/db";
import { availability, draws, picks } from "@/lib/db/schema";
import { currentAdmin, currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Shell } from "../shell";
import { roster } from "./admin-actions";
import admin from "./admin.module.css";
import { Panel } from "./panel";
import { Unlock } from "../restaurants/unlock";

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
      <Shell secret={secret} member={member} section="month">
        <h1 className={styles.title}>Not for you</h1>
        <p className={styles.lede}>
          Only Jada can add people or overrule the month. Everything else is
          everyone&rsquo;s.
        </p>
      </Shell>
    );
  }

  const unlocked = await currentAdmin();
  if (!unlocked) {
    return (
      <Shell secret={secret} member={member} section="month">
        <h1 className={styles.title}>Admin</h1>
        <p className={styles.lede}>Enter your PIN to unlock this on this phone.</p>
        <Unlock secret={secret} />
      </Shell>
    );
  }

  const db = getDb();
  const outing = (await openOuting()) ?? (await latestSettledOuting());
  const people = await roster();

  let topDays: { day: string; count: number; label: string }[] = [];
  let emptyTier = false;
  let rerolled = false;

  if (outing) {
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

    topDays = computeChosenDate(daysInMonth(outing.month), tapped).topDays.map(
      (tally) => ({ ...tally, label: shortDate(tally.day) }),
    );
    emptyTier = inTier.length === 0;
    rerolled = drawRows.some((row) => row.isReroll);
  }

  return (
    <Shell secret={secret} member={member} section="month" eyebrow="Admin">
      <h1 className={styles.title}>Admin</h1>
      <p className={admin.hint}>Unlocked on this phone for 30 days.</p>
      <Panel
        secret={secret}
        people={people}
        outing={
          outing
            ? {
                id: outing.id,
                month: outing.month,
                tier: outing.tier,
                status: outing.status,
                chosenDate: outing.chosenDate,
                rerolled,
              }
            : null
        }
        topDays={topDays}
        emptyTier={emptyTier}
      />
    </Shell>
  );
}
