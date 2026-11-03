import { asc, count, eq, isNull } from "drizzle-orm";

import Link from "next/link";

import { InstallBanner, NotificationsSetup } from "@/components/device-setup";
import { monthName, shortDate } from "@/lib/cycle/announcement";
import { addMonths, todayInLondon } from "@/lib/cycle/dates";
import {
  announcedOuting,
  latestDoneOuting,
  loadMonthView,
  loadReveal,
  loadVisits,
  openOuting,
} from "@/lib/cycle/month-view";
import { isSettled, loadVote, rotaFor, voteMonthFor } from "@/lib/cycle/vote";
import { getDb } from "@/lib/db";
import { members, outings, picks } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import { claimNameForm } from "./actions";
import styles from "./page.module.css";
import { Rate } from "./rate";
import { VisitScores } from "./rating-lines";
import { Reveal } from "./reveal";
import { Vote } from "./vote";

/**
 * The Dinner screen: the ticket, then one card per thing that might want you.
 *
 * Each card is a door to a tab, and says what is waiting behind it — how many
 * evenings you've tapped, whether the last dinner has your score — so the
 * screen reads as a to-do list rather than a menu.
 */
export default async function GroupHome({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();

  if (!member) return <PickYourName secret={secret} />;

  const today = todayInLondon();
  const [open, announced, done, vote, placeCounts, dinners] = await Promise.all([
    openOuting(),
    announcedOuting(),
    latestDoneOuting(),
    loadVoteBlock(member.id),
    getDb()
      .select({ memberId: picks.memberId })
      .from(picks),
    getDb()
      .select({ n: count() })
      .from(outings)
      .where(eq(outings.status, "done")),
  ]);

  // The last dinner stays on this screen for a few weeks. Anyone can read the
  // scores; only a Member in the Visit's attendance is asked to rate it.
  const recentId =
    done?.chosenDate && daysAgo(done.chosenDate, today) <= 21 ? done.id : null;
  const [view, visits] = await Promise.all([
    open ? loadMonthView(open, member.id) : Promise.resolve(null),
    recentId ? loadVisits() : Promise.resolve(null),
  ]);
  const recentVisit = visits?.find((visit) => visit.outingId === recentId) ?? null;
  const attended = recentVisit?.attendees.includes(member.id) ?? false;
  const mine = recentVisit?.ratings.find((row) => row.memberId === member.id) ?? null;
  const nothingSettled = !announced;

  const nextMonth = open?.month ?? (announced ? addMonths(announced.month, 1) : null);

  return (
    <>
      <InstallBanner />
      {announced ? (
        <Reveal
          data={await loadReveal(announced, member.id)}
          secret={secret}
          isAdmin={member.isAdmin}
        />
      ) : nothingSettled && done && !open ? (
        <Reveal
          data={await loadReveal(done, member.id)}
          secret={secret}
          isAdmin={member.isAdmin}
        />
      ) : null}

      {recentVisit && attended ? (
        <Rate
          secret={secret}
          outingId={recentVisit.outingId}
          place={
            recentVisit.place ??
            (recentVisit.kind === "party" ? "the dinner party" : monthName(recentVisit.month))
          }
          existing={mine ? { score: mine.score, note: mine.note } : null}
        />
      ) : null}

      {recentVisit ? (
        <VisitScores average={recentVisit.averageScore} ratings={recentVisit.ratings} />
      ) : null}

      <nav className={styles.doors} aria-label="What's next">
        {view ? (
          <Link href={`/g/${secret}/dates`} className={`${styles.door} ${view.mine.size === 0 ? styles.doorHot : ""}`}>
            <strong>Your dates for {monthName(view.month)}</strong>
            <span>
              {view.mine.size === 0
                ? "Nothing tapped yet"
                : `${view.mine.size} ${view.mine.size === 1 ? "evening" : "evenings"} tapped`}
              {" · "}closes {shortDate(view.closeDay)}
            </span>
          </Link>
        ) : (
          <Link href={`/g/${secret}/dates`} className={styles.door}>
            <strong>Your dates</strong>
            <span>
              {nextMonth
                ? `${monthName(nextMonth)} opens on the 1st. Fill in the year ahead.`
                : "Fill in the year ahead."}
            </span>
          </Link>
        )}

        <Link href={`/g/${secret}/places`} className={styles.door}>
          <strong>Add a place</strong>
          <span>
            {placeCounts.length === 0
              ? "The list is empty"
              : `${placeCounts.length} on the list`}
            {" · "}
            {placeCounts.filter((row) => row.memberId === member.id).length} yours
          </span>
        </Link>

        <Link href={`/g/${secret}/past`} className={styles.door}>
          <strong>Past dinners</strong>
          <span>
            {dinners[0]?.n
              ? `${dinners[0].n} so far${attended && !mine ? " · one needs your score" : ""}`
              : "None yet"}
          </span>
        </Link>
      </nav>

      {vote ? <Vote secret={secret} view={vote} me={member.name} /> : null}

      <NotificationsSetup secret={secret} />
    </>
  );
}

function daysAgo(day: string, today: string): number {
  const then = new Date(`${day}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  return Math.round((now - then) / 86_400_000);
}

/** The vote on the month after next, or null once that month has an Outing. */
async function loadVoteBlock(memberId: string) {
  const month = voteMonthFor(todayInLondon());
  if (await isSettled(month)) return null;
  return loadVote(month, memberId, await rotaFor(month));
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
