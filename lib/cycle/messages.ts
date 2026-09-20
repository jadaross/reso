import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  attendance,
  availability,
  groupSecrets,
  members,
  outings,
  picks,
  plusOnes,
  pushSubscriptions,
  sentMessages,
} from "@/lib/db/schema";
import { sendToSubscriptions } from "@/lib/push/send";

import { announcementText, monthName } from "./announcement";

const TIER_WORD = { low: "cheap", medium: "middling", high: "expensive" } as const;
import {
  closeDayFor,
  stockUpDayFor,
  todayInLondon,
  type DayString,
} from "./dates";

/**
 * The message calendar, settled in wayfinder ticket 05.
 *
 * Every kind fires at most once per Outing, enforced by a unique key on
 * (outing, kind) rather than by the job knowing what day it is — Hobby's cron may
 * double-fire and does not retry, so "have we sent this yet" is the only safe
 * question to ask.
 *
 * WORDING IS A DRAFT. Ticket 05 expects Jada to rewrite these once she has seen
 * them arrive on a real phone. They are all in this one file so that doing so
 * touches nothing else.
 */
export type MessageKind =
  | "opened"
  | "stock-up"
  | "last-call"
  | "closing-soon"
  | "announced"
  | "admin-nudge"
  | "day-before"
  | "rate";

type Audience = "everyone" | "silent" | "admins" | "attending";

const CALENDAR: Record<
  MessageKind,
  { audience: Audience; tag: string }
> = {
  opened: { audience: "everyone", tag: "month" },
  "stock-up": { audience: "everyone", tag: "list" },
  "last-call": { audience: "silent", tag: "month" },
  "closing-soon": { audience: "everyone", tag: "month" },
  announced: { audience: "everyone", tag: "month" },
  "admin-nudge": { audience: "admins", tag: "admin" },
  "day-before": { audience: "attending", tag: "dinner" },
  rate: { audience: "attending", tag: "dinner" },
};

export function copyFor(
  kind: MessageKind,
  facts: {
    month: string;
    place: string | null;
    party: boolean;
    answered: number;
    total: number;
    announcement: string;
    /** Picks in this month's tier. */
    inTier: number;
    tierLabel: string;
  },
): { title: string; body: string } {
  const month = monthName(facts.month);

  switch (kind) {
    case "opened":
      return {
        title: `${month} is open`,
        body: "Tap the evenings you can do.",
      };
    case "stock-up":
      return {
        title: "Add some places",
        body: `${month} is a ${facts.tierLabel} month. Anywhere you fancy — it takes ten seconds.`,
      };
    case "closing-soon":
      return {
        title: `${month} closes in two days`,
        body: "Last chance to change the evenings you can do.",
      };
    case "last-call":
      return {
        title: `${month} closes in a week`,
        body: `${facts.answered} of ${facts.total} are in. Yours are still blank.`,
      };
    case "announced":
      return { title: `${month} is settled`, body: facts.announcement };
    case "admin-nudge":
      return {
        title: `${month} hasn't been shared`,
        body: "The group still doesn't know where you're going.",
      };
    case "day-before":
      return {
        title: facts.party ? "Dinner party tomorrow" : `${facts.place ?? "Dinner"} tomorrow`,
        body: facts.announcement,
      };
    case "rate":
      return {
        title: facts.party ? "How was the dinner party?" : `How was ${facts.place ?? "it"}?`,
        body: "Give it a score while you still remember.",
      };
  }
}

/** The live Group Link, so a notification opens the app rather than a dead path. */
async function groupPath(): Promise<string> {
  const [live] = await getDb()
    .select({ secret: groupSecrets.secret })
    .from(groupSecrets)
    .where(isNull(groupSecrets.revokedAt))
    .limit(1);
  return live ? `/g/${live.secret}` : "/";
}

async function audienceSubscriptions(audience: Audience, outingId: string) {
  const db = getDb();
  const base = db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(members, eq(members.id, pushSubscriptions.memberId));

  if (audience === "everyone") {
    return base.where(isNull(members.archivedAt));
  }

  if (audience === "admins") {
    return base.where(and(isNull(members.archivedAt), eq(members.isAdmin, true)));
  }

  if (audience === "attending") {
    const going = db
      .select({ memberId: attendance.memberId })
      .from(attendance)
      .where(eq(attendance.outingId, outingId));
    return base.where(
      and(isNull(members.archivedAt), inArray(members.id, going)),
    );
  }

  // "silent": only Members who have recorded no Availability at all. Nagging people
  // who have already answered is how a group app gets muted.
  const answered = db
    .select({ memberId: availability.memberId })
    .from(availability)
    .where(eq(availability.outingId, outingId));

  return base.where(
    and(isNull(members.archivedAt), notInArray(members.id, answered)),
  );
}

/**
 * Send one message kind for one Outing, unless it has already gone.
 *
 * The claim is written first and the push sent second: a crash after sending would
 * otherwise send it twice on the next run, and a missed notification is a far
 * smaller problem than a duplicate one.
 */
export async function sendOnce(
  outingId: string,
  kind: MessageKind,
  copy: { title: string; body: string },
): Promise<{ sent: number; skipped: boolean }> {
  const db = getDb();

  const claimed = await db
    .insert(sentMessages)
    .values({ outingId, kind })
    .onConflictDoNothing()
    .returning({ id: sentMessages.id });

  if (claimed.length === 0) return { sent: 0, skipped: true };

  const subscriptions = await audienceSubscriptions(
    CALENDAR[kind].audience,
    outingId,
  );

  const { sent } = await sendToSubscriptions(subscriptions, {
    title: copy.title,
    body: copy.body,
    url: await groupPath(),
    tag: CALENDAR[kind].tag,
  });

  return { sent, skipped: false };
}

/**
 * Everything due today, across every Outing.
 *
 * Driven by what is true today rather than by the calendar date, so a cron that
 * fires late, twice, or not at all still converges on the right state.
 */
export async function sendDueMessages(
  today: DayString = todayInLondon(),
): Promise<{ kind: MessageKind; month: string; sent: number }[]> {
  const db = getDb();
  const done: { kind: MessageKind; month: string; sent: number }[] = [];

  const live = await db
    .select()
    .from(outings)
    .where(inArray(outings.status, ["open", "announced", "done"]));

  for (const outing of live) {
    const [tapped, going, plusOneRows, total, drawn, inTier] = await Promise.all([
      db
        .selectDistinct({ memberId: availability.memberId })
        .from(availability)
        .where(eq(availability.outingId, outing.id)),
      db
        .select({ memberId: attendance.memberId })
        .from(attendance)
        .where(eq(attendance.outingId, outing.id)),
      db
        .select({ memberId: plusOnes.memberId })
        .from(plusOnes)
        .where(eq(plusOnes.outingId, outing.id)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(members)
        .where(isNull(members.archivedAt)),
      outing.drawnPickId
        ? db
            .select({ name: picks.name })
            .from(picks)
            .where(eq(picks.id, outing.drawnPickId))
            .limit(1)
        : Promise.resolve([]),
      db.select({ id: picks.id }).from(picks).where(eq(picks.tier, outing.tier)),
    ]);

    const facts = {
      month: outing.month,
      place: drawn[0]?.name ?? null,
      party: outing.kind === "party",
      answered: tapped.length,
      total: total[0]?.n ?? 0,
      inTier: inTier.length,
      tierLabel: TIER_WORD[outing.tier],
      announcement: announcementText({
        month: outing.month,
        kind: outing.kind,
        chosenDate: outing.chosenDate,
        place: drawn[0]?.name ?? null,
        area: null,
        tier: outing.tier,
        going: going.length,
        plusOnes: plusOneRows.length,
        tickets: 0,
      }),
    };

    const due: MessageKind[] = [];

    if (outing.status === "open") {
      due.push("opened");

      // The 5th, unconditionally, and anchored to the 5th rather than to Close Day.
      // An earlier version only fired when the tier was thin, which meant the most
      // active months went silent — the point is to keep people opening the app, not
      // only to rescue an empty list. Anchoring it here keeps it early even though
      // Close Day has since moved a week later.
      // Not for a dinner party: there is no list to stock.
      if (outing.kind !== "party" && today >= stockUpDayFor(outing.month)) {
        due.push("stock-up");
      }

      // A week before Close Day, derived from closeDayFor rather than restated —
      // the same rule the Draw uses, so the nudge cannot drift away from the close.
      if (today >= addDays(closeDayFor(outing.month), -7)) {
        due.push("last-call");
      }

      if (today >= addDays(closeDayFor(outing.month), -2)) {
        due.push("closing-soon");
      }
    }

    if (outing.status === "announced") {
      due.push("announced");

      // The day after Close Day, if the Admin has not yet forwarded it. The site
      // cannot see into WhatsApp, so pressing Share is what records "shared".
      if (today > closeDayFor(outing.month) && !(await hasSent(outing.id, "shared"))) {
        due.push("admin-nudge");
      }

      if (outing.chosenDate && dayBefore(outing.chosenDate) <= today) {
        due.push("day-before");
      }
    }

    if (outing.status === "done") due.push("rate");

    for (const kind of due) {
      const { sent, skipped } = await sendOnce(outing.id, kind, copyFor(kind, facts));
      if (!skipped) done.push({ kind, month: outing.month, sent });
    }
  }

  return done;
}

function dayBefore(day: DayString): DayString {
  return addDays(day, -1);
}

function addDays(day: DayString, delta: number): DayString {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

async function hasSent(outingId: string, kind: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: sentMessages.id })
    .from(sentMessages)
    .where(and(eq(sentMessages.outingId, outingId), eq(sentMessages.kind, kind)))
    .limit(1);
  return Boolean(row);
}
