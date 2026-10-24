import { asc, isNull } from "drizzle-orm";

import Link from "next/link";

import { FinishSetup } from "@/components/finish-setup";
import { monthName, shortDate } from "@/lib/cycle/announcement";
import { todayInLondon } from "@/lib/cycle/dates";
import {
  announcedOuting,
  didAttend,
  latestDoneOuting,
  loadMonthView,
  loadReveal,
  myRating,
  openOuting,
} from "@/lib/cycle/month-view";
import { isSettled, loadVote, rotaFor, voteMonthFor } from "@/lib/cycle/vote";
import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import { claimNameForm } from "./actions";
import { Calendar } from "./calendar";
import { Eyebrow } from "./frame";
import { InTheRunning } from "./in-the-running";
import styles from "./page.module.css";
import { Rate } from "./rate";
import { Reveal } from "./reveal";
import { Vote } from "./vote";

const TIER_LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

/**
 * The month screen, top to bottom: the dinner that is settled and still ahead,
 * the month that is taking dates, the last dinner if it wants rating, the vote.
 *
 * The first two overlap for most of every month — the next month opens on the
 * 1st and the dinner is usually mid-month — so they are both here, in that
 * order, rather than one hiding the other.
 */
export default async function GroupHome({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();

  if (!member) return <PickYourName secret={secret} />;

  const [open, announced, done, vote] = await Promise.all([
    openOuting(),
    announcedOuting(),
    latestDoneOuting(),
    loadVoteBlock(member.id),
  ]);

  const eyebrow = open
    ? open.kind === "party"
      ? `${monthName(open.month)}: dinner party`
      : `${monthName(open.month)}: ${TIER_LABEL[open.tier].toLowerCase()}`
    : announced
      ? announced.kind === "party"
        ? "Dinner party"
        : `${TIER_LABEL[announced.tier]} month`
      : "";

  // The last dinner is asked about until it has been rated, for a few weeks.
  const askAbout =
    done && done.chosenDate && daysAgo(done.chosenDate) <= 21 && (await didAttend(done.id, member.id))
      ? done
      : null;
  const existing = askAbout ? await myRating(askAbout.id, member.id) : null;
  const showRate = askAbout && (!existing || (!open && !announced));

  const view = open ? await loadMonthView(open, member.id) : null;

  return (
    <>
      {eyebrow ? <Eyebrow text={eyebrow} /> : null}

      {announced ? (
        <Reveal
          data={await loadReveal(announced, member.id)}
          secret={secret}
          isAdmin={member.isAdmin}
        />
      ) : null}

      {open && view ? (
        <section className={announced ? styles.nextMonth : undefined}>
          <h1 className={announced ? styles.subtitle : styles.title}>
            {monthName(view.month)}
          </h1>
          <p className={styles.lede}>
            Tap every evening you could make. Closes {shortDate(view.closeDay)}.
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
            <Link href={`/g/${secret}/settings`}>Fill in the year</Link>.
          </p>
        </section>
      ) : null}

      {!open && !announced && done ? (
        <Reveal
          data={await loadReveal(done, member.id)}
          secret={secret}
          isAdmin={member.isAdmin}
        />
      ) : null}

      {showRate && askAbout ? (
        <Rate
          secret={secret}
          outingId={askAbout.id}
          place={await placeLabel(askAbout)}
          existing={existing}
        />
      ) : null}

      {!open && !announced && !done ? <BetweenMonths /> : null}

      {vote ? <Vote secret={secret} view={vote} me={member.name} /> : null}
      <FinishSetup secret={secret} />
    </>
  );
}

async function placeLabel(outing: NonNullable<Awaited<ReturnType<typeof latestDoneOuting>>>) {
  if (outing.kind === "party") return "the dinner party";
  const reveal = await loadReveal(outing, "");
  return reveal.place ?? monthName(outing.month);
}

function daysAgo(day: string): number {
  const then = new Date(`${day}T00:00:00Z`).getTime();
  const now = new Date(`${todayInLondon()}T00:00:00Z`).getTime();
  return Math.round((now - then) / 86_400_000);
}

/**
 * The vote on the month after next, or null once that month has an Outing.
 *
 * Shown in both states of this screen: while a month is open and after it has
 * closed, because the vote runs until the 1st regardless of where the dinner
 * cycle is.
 */
async function loadVoteBlock(memberId: string) {
  const month = voteMonthFor(todayInLondon());
  if (await isSettled(month)) return null;
  return loadVote(month, memberId, await rotaFor(month));
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

  return `${shortDate(leader.day)} leads with ${leader.count} of ${
    view.memberCount
  }. ${waiting}`;
}

function BetweenMonths() {
  return (
    <>
      <h1 className={styles.title}>Nothing open</h1>
      <p className={styles.lede}>
        The next month opens on the 1st. Add somewhere you fancy in the meantime.
      </p>
    </>
  );
}

async function PickYourName({ secret }: { secret: string }) {
  const roster = await getDb()
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(isNull(members.archivedAt))
    .orderBy(asc(members.name));

  return (
    <>
      <h1 className={styles.title}>Who are you?</h1>
      {roster.length === 0 ? (
        <p className={styles.empty}>
          Nobody has been added to the group yet. Whoever set Reso up needs to add
          the names first.
        </p>
      ) : (
        <div className={styles.stubs}>
          {roster.map((person) => (
            <form action={claimNameForm} key={person.id}>
              <input type="hidden" name="secret" value={secret} />
              <input type="hidden" name="memberId" value={person.id} />
              <button type="submit" className={styles.stub}>
                {person.name}
              </button>
            </form>
          ))}
        </div>
      )}
      <p className={styles.note}>
        This phone will remember you. If you add Reso to your Home Screen later,
        tap your name once more inside it.
      </p>
    </>
  );
}
