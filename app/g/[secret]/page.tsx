import { asc, isNull } from "drizzle-orm";

import Link from "next/link";

import { FinishSetup } from "@/components/finish-setup";
import { monthName } from "@/lib/cycle/announcement";
import {
  didAttend,
  latestSettledOuting,
  loadMonthView,
  loadReveal,
  myRating,
  openOuting,
} from "@/lib/cycle/month-view";
import { getDb } from "@/lib/db";
import { members, type Member } from "@/lib/db/schema";
import { currentAdmin, currentMember } from "@/lib/identity/guard";

import { claimNameForm } from "./actions";
import { Calendar } from "./calendar";
import { Rate } from "./rate";
import { Reveal } from "./reveal";
import styles from "./page.module.css";
import { BareShell, Shell } from "./shell";
import { InTheRunning } from "./in-the-running";

const TIER_LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

export default async function GroupHome({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();

  if (!member) return <PickYourName secret={secret} />;

  const outing = await openOuting();

  // Nothing taking Availability: show the month that has already been settled,
  // which is what people open the app for between the 15th and the dinner.
  if (!outing) {
    const settled = await latestSettledOuting();
    if (!settled) return <BetweenMonths secret={secret} member={member} />;

    const reveal = await loadReveal(settled);
    const admin = await currentAdmin();

    // The morning after: whoever went is asked how it was, once.
    const askForRating =
      settled.status === "done" &&
      reveal.place !== null &&
      (await didAttend(settled.id, member.id));
    const existing = askForRating
      ? await myRating(settled.id, member.id)
      : null;

    return (
      <Shell
        secret={secret}
        member={member}
        section="month"
        eyebrow={`${TIER_LABEL[settled.tier]} month`}
      >
        {/* No heading: the ticket carries the month, and printing it twice above
            its own stamp is the sort of thing that makes a screen feel generated. */}
        <Reveal data={reveal} outingId={settled.id} isAdmin={Boolean(admin)} />
        {askForRating && reveal.place ? (
          <Rate
            secret={secret}
            outingId={settled.id}
            place={reveal.place}
            existing={existing}
          />
        ) : null}
        <FinishSetup secret={secret} />
      </Shell>
    );
  }

  const view = await loadMonthView(outing, member.id);

  return (
    <Shell
      secret={secret}
      member={member}
      section="month"
      eyebrow={`${TIER_LABEL[view.tier]} month`}
    >
      <h1 className={styles.title}>{monthName(view.month)}</h1>
      <p className={styles.lede}>
        Tap every evening you could make. Closes {readableDay(view.closeDay)}.
      </p>

      <Calendar
        secret={secret}
        cells={view.cells}
        mine={[...view.mine]}
        freeByDay={Object.fromEntries(view.freeByDay)}
        memberCount={view.memberCount}
        myPlusOne={view.myPlusOne}
        locked={false}
      />

      <p className={styles.standing}>{standing(view)}</p>

      <InTheRunning
        leaders={view.leaders}
        whoByDay={view.whoByDay}
        answered={view.answeredNames}
        silent={view.silentNames}
        memberCount={view.memberCount}
      />

      <p className={styles.aside}>
        Know your dates further out?{" "}
        <Link href={`/g/${secret}/settings`}>Fill in the year</Link> and they will
        be in before each month opens.
      </p>
      <FinishSetup secret={secret} />
    </Shell>
  );
}

/** The line under the calendar: where the month has got to, in words. */
function standing(view: Awaited<ReturnType<typeof loadMonthView>>): string {
  const leader = view.leaders[0];
  const waiting =
    view.silentCount === 0
      ? "Everyone has answered."
      : `${view.silentCount} of ${view.memberCount} ${
          view.silentCount === 1 ? "has" : "have"
        } not answered yet.`;

  if (!leader) return `Nobody has picked an evening yet. ${waiting}`;

  return `${readableDay(leader.day)} leads with ${leader.count} of ${
    view.memberCount
  }. ${waiting}`;
}

function readableDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function BetweenMonths({ secret, member }: { secret: string; member: Member }) {
  return (
    <Shell secret={secret} member={member} section="month">
      <h1 className={styles.title}>Nothing open</h1>
      <p className={styles.lede}>
        The next month opens on the 1st. Add somewhere you fancy in the meantime.
      </p>
    </Shell>
  );
}

async function PickYourName({ secret }: { secret: string }) {
  const roster = await getDb()
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(isNull(members.archivedAt))
    .orderBy(asc(members.name));

  return (
    <BareShell>
      <h1 className={styles.title}>Who are you?</h1>
      {roster.length === 0 ? (
        <p className={styles.empty}>
          Nobody has been added to the group yet. Whoever set Reso up needs to add
          the names first.
        </p>
      ) : (
        roster.map((person) => (
          <form action={claimNameForm} key={person.id}>
            <input type="hidden" name="secret" value={secret} />
            <input type="hidden" name="memberId" value={person.id} />
            <button type="submit" className={styles.stub}>
              {person.name}
            </button>
          </form>
        ))
      )}
      <p className={styles.note}>
        Tap your name once and this phone will remember it. If you add Reso to your
        Home Screen afterwards, tap it once more inside the app.
      </p>
    </BareShell>
  );
}
