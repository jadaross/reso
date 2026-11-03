"use server";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { monthName, shortDate } from "@/lib/cycle/announcement";
import { drawPoolFor, labelCandidates } from "@/lib/cycle/candidates";
import { computeChosenDate } from "@/lib/cycle/chosen-date";
import { closeDueOutings } from "@/lib/cycle/close";
import { daysInMonth, type DayString } from "@/lib/cycle/dates";
import { drawFrom } from "@/lib/cycle/draw";
import { decideMonth } from "@/lib/cycle/month-choice";
import {
  clearDatePin,
  pinNote,
  stablePick,
  tapNight,
  tierClearedNote,
  tierSetNote,
  tierSource,
  voteAgainNote,
} from "@/lib/cycle/override";
import { formatPriceTier } from "@/lib/cycle/tier";
import { rotaFor, votesFor } from "@/lib/cycle/vote";
import { getDb } from "@/lib/db";
import {
  advanceAvailability,
  attendance,
  availability,
  draws,
  members,
  outings,
  pushSubscriptions,
  type MonthChoice,
} from "@/lib/db/schema";
import { sendToSubscriptions } from "@/lib/push/send";
import { requireAdmin } from "@/lib/identity/guard";
import { generateGroupSecret } from "@/lib/identity/token";
import { groupSecrets } from "@/lib/db/schema";

export type AdminResult = { ok: true; note?: string } | { ok: false; error: string };

function refresh(secret: string) {
  revalidatePath(`/g/${secret}`);
  revalidatePath(`/g/${secret}/admin`);
  revalidatePath(`/g/${secret}/dates`);
  revalidatePath(`/g/${secret}/places`);
}

/**
 * Add someone to the Group.
 *
 * A Member exists the moment their name is typed. Nothing is sent and no account is
 * created — the name simply waits, visibly unopened, until one of their Devices taps
 * it on the pick-your-name screen. Re-adding an archived name brings them back
 * rather than making a second person with the same name.
 */
export async function addMember(
  secret: string,
  rawName: string,
): Promise<AdminResult> {
  await requireAdmin();

  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Type a name." };
  if (name.length > 40) return { ok: false, error: "That name is too long." };

  const db = getDb();
  const [existing] = await db
    .select({ id: members.id, archivedAt: members.archivedAt })
    .from(members)
    .where(eq(members.name, name))
    .limit(1);

  if (existing && !existing.archivedAt) {
    return { ok: false, error: `${name} is already in the group.` };
  }

  if (existing?.archivedAt) {
    await db
      .update(members)
      .set({ archivedAt: null })
      .where(eq(members.id, existing.id));
    refresh(secret);
    return { ok: true, note: `${name} restored.` };
  }

  await db.insert(members).values({ name });
  refresh(secret);
  return { ok: true, note: `${name} added. They just open the same link.` };
}

/**
 * Archive a Member, never delete them.
 *
 * Their Picks stay in the pool — the Group liked those restaurants — and their past
 * attendance and ratings keep their names, because history must not silently
 * rewrite itself. Only their Availability on a still-open Outing goes, so they stop
 * counting toward a date they will not be at.
 */
export async function archiveMember(
  secret: string,
  memberId: string,
): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (admin.id === memberId) {
    return { ok: false, error: "You can't archive yourself." };
  }

  const db = getDb();
  const openOutings = await db
    .select({ id: outings.id })
    .from(outings)
    .where(eq(outings.status, "open"));

  if (openOutings.length > 0) {
    await db.delete(availability).where(
      and(
        eq(availability.memberId, memberId),
        inArray(
          availability.outingId,
          openOutings.map((row) => row.id),
        ),
      ),
    );
  }

  // Nor should their advance answers fill in months they will not be around for.
  await db
    .delete(advanceAvailability)
    .where(eq(advanceAvailability.memberId, memberId));

  await db
    .update(members)
    .set({ archivedAt: new Date() })
    .where(eq(members.id, memberId));

  refresh(secret);
  return { ok: true, note: "Archived." };
}

/** Put an archived Member back into the Group. */
export async function restoreMember(
  secret: string,
  memberId: string,
): Promise<AdminResult> {
  await requireAdmin();

  const db = getDb();
  const [member] = await db
    .select({ name: members.name, archivedAt: members.archivedAt })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member?.archivedAt) {
    return { ok: false, error: "They aren't archived." };
  }

  await db
    .update(members)
    .set({ archivedAt: null })
    .where(eq(members.id, memberId));

  refresh(secret);
  return { ok: true, note: `${member.name} restored.` };
}

/**
 * Override what kind of month this is — a birthday can be expensive out of turn,
 * and a dinner party can be called without a vote. Switching back to a tier
 * makes it a restaurant month again.
 */
export async function overrideTier(
  secret: string,
  outingId: string,
  choice: MonthChoice,
): Promise<AdminResult> {
  await requireAdmin();

  const db = getDb();
  const [outing] = await db
    .select({ month: outings.month })
    .from(outings)
    .where(eq(outings.id, outingId))
    .limit(1);
  if (!outing) return { ok: false, error: "That month is gone." };

  await db
    .update(outings)
    .set(
      choice === "party"
        ? { kind: "party", tierOverridden: true }
        : { kind: "restaurant", tier: choice, tierOverridden: true },
    )
    .where(eq(outings.id, outingId));

  refresh(secret);
  const mark = choice === "party" ? "a dinner party" : formatPriceTier(choice);
  return { ok: true, note: tierSetNote(monthName(outing.month), mark) };
}

/** Put the month back to whatever the rota or the vote had already decided. */
export async function clearTierOverride(
  secret: string,
  outingId: string,
): Promise<AdminResult> {
  await requireAdmin();

  const db = getDb();
  const [outing] = await db
    .select({ month: outings.month })
    .from(outings)
    .where(eq(outings.id, outingId))
    .limit(1);
  if (!outing) return { ok: false, error: "That month is gone." };

  const [votes, rota] = await Promise.all([
    votesFor(outing.month),
    rotaFor(outing.month),
  ]);
  const decision = decideMonth(votes, rota, stablePick);

  await db
    .update(outings)
    .set({ kind: decision.kind, tier: decision.tier, tierOverridden: false })
    .where(eq(outings.id, outingId));

  refresh(secret);
  return {
    ok: true,
    note: tierClearedNote(monthName(outing.month), tierSource(decision.how)),
  };
}

/**
 * Pin a night, or clear the pin by tapping it again.
 *
 * Who is going follows the date, so a closed Outing's attendance is rebuilt
 * from Availability on the night that results. An open Outing has no attendance
 * yet; Close Day writes it, and a pin still in place is the date it uses.
 */
export async function overrideChosenDate(
  secret: string,
  outingId: string,
  day: string,
): Promise<AdminResult> {
  const admin = await requireAdmin();
  return applyDate(secret, outingId, (current, recomputed) => {
    const next = tapNight(current, day as DayString, recomputed);
    return { ...next, pinnedBy: next.overridden ? admin.id : null };
  });
}

/** Drop the pin and take the night the tally leads with now. */
export async function letVoteDecide(
  secret: string,
  outingId: string,
): Promise<AdminResult> {
  await requireAdmin();
  return applyDate(secret, outingId, (_current, recomputed) => ({
    ...clearDatePin(recomputed),
    pinnedBy: null,
  }));
}

async function applyDate(
  secret: string,
  outingId: string,
  decide: (
    current: { chosenDate: DayString | null; overridden: boolean },
    recomputed: DayString | null,
  ) => { chosenDate: DayString | null; overridden: boolean; pinnedBy: string | null },
): Promise<AdminResult> {
  const db = getDb();
  const [outing] = await db
    .select({
      month: outings.month,
      status: outings.status,
      chosenDate: outings.chosenDate,
      chosenDateOverridden: outings.chosenDateOverridden,
    })
    .from(outings)
    .where(eq(outings.id, outingId))
    .limit(1);
  if (!outing) return { ok: false, error: "That month is gone." };

  const tapped = await db
    .select({ memberId: availability.memberId, day: availability.day })
    .from(availability)
    .innerJoin(members, eq(members.id, availability.memberId))
    .where(and(eq(availability.outingId, outingId), isNull(members.archivedAt)));

  const recomputed = computeChosenDate(daysInMonth(outing.month), tapped).chosenDate;
  const next = decide(
    { chosenDate: outing.chosenDate, overridden: outing.chosenDateOverridden },
    recomputed,
  );

  await db
    .update(outings)
    .set({
      chosenDate: next.chosenDate,
      chosenDateOverridden: next.overridden,
      chosenDatePinnedBy: next.pinnedBy,
    })
    .where(eq(outings.id, outingId));

  if (outing.status !== "open") {
    await db.delete(attendance).where(eq(attendance.outingId, outingId));
    if (next.chosenDate) {
      const free = tapped.filter((row) => row.day === next.chosenDate);
      const memberIds = [...new Set(free.map((row) => row.memberId))];
      if (memberIds.length > 0) {
        await db
          .insert(attendance)
          .values(memberIds.map((memberId) => ({ outingId, memberId })))
          .onConflictDoNothing();
      }
    }
  }

  refresh(secret);
  const month = monthName(outing.month);
  if (next.overridden && next.chosenDate) {
    return { ok: true, note: pinNote(month, shortDate(next.chosenDate)) };
  }
  return {
    ok: true,
    note: voteAgainNote(month, next.chosenDate ? shortDate(next.chosenDate) : null),
  };
}

/**
 * Redraw, once.
 *
 * For a place that turns out to be shut or unbookable. Every draw is recorded, so a
 * reroll is visible to the whole group rather than something that can be repeated
 * quietly until the answer is agreeable.
 */
export async function reroll(
  secret: string,
  outingId: string,
): Promise<AdminResult> {
  await requireAdmin();

  const db = getDb();
  const [outing] = await db
    .select({
      id: outings.id,
      tier: outings.tier,
      drawnPickId: outings.drawnPickId,
      chosenDate: outings.chosenDate,
    })
    .from(outings)
    .where(eq(outings.id, outingId))
    .limit(1);

  if (!outing) return { ok: false, error: "That month is gone." };

  const already = await db
    .select({ isReroll: draws.isReroll })
    .from(draws)
    .where(eq(draws.outingId, outingId));

  if (already.some((row) => row.isReroll)) {
    return { ok: false, error: "You've already redrawn this month." };
  }

  // The same pool Close Day drew from — narrowed to people free on the Chosen
  // Date, which follows the date if the Admin has since moved it — minus the
  // place that just failed.
  const { candidates } = await drawPoolFor(outing.id, outing.tier, outing.chosenDate, {
    exclude: outing.drawnPickId,
  });

  const drawn = drawFrom(candidates);
  if (!drawn) {
    return { ok: false, error: "Nothing else in this tier to draw." };
  }

  await db
    .update(outings)
    .set({ drawnPickId: drawn.id })
    .where(eq(outings.id, outingId));

  await db.insert(draws).values({
    outingId,
    pickId: drawn.id,
    isReroll: true,
    candidateCount: candidates.length,
    candidatePicks: await labelCandidates(candidates.map((candidate) => candidate.id)),
  });

  refresh(secret);
  return { ok: true, note: "Redrawn. Everyone can see it was a second go." };
}

/** Close Availability early, once everyone is in. Runs the same path as Close Day. */
export async function closeEarly(secret: string, outingId: string): Promise<AdminResult> {
  await requireAdmin();

  // closeDueOutings closes anything whose Close Day has passed, so handing it a
  // date far enough ahead runs exactly the same code the cron runs, rather than a
  // second implementation that could drift from it. Scoped to the one month on
  // screen, so a second open month is left alone.
  const results = await closeDueOutings("2999-12-31", outingId);
  refresh(secret);

  if (results.length === 0) return { ok: false, error: "Nothing was open." };
  const [first] = results;
  return {
    ok: true,
    note: first.drawnPickId
      ? "Closed and drawn."
      : "Closed, but the tier had nothing in it to draw.",
  };
}

/**
 * Undo "I've booked it".
 *
 * It used to be a link under the ticket that any Member could tap, so a stray
 * thumb could clear a real booking. Now it lives here, with the other things
 * only an Admin should be able to reverse.
 */
export async function unbook(secret: string, outingId: string): Promise<AdminResult> {
  await requireAdmin();

  const cleared = await getDb()
    .update(outings)
    .set({ bookedAt: null, bookedBy: null, bookedFor: null })
    .where(and(eq(outings.id, outingId), eq(outings.status, "announced")))
    .returning({ id: outings.id });

  refresh(secret);
  if (cleared.length === 0) return { ok: false, error: "That month can't be changed now." };
  return { ok: true, note: "Marked as not booked." };
}

/** Rotate the Group Link. Devices already signed in are unaffected. */
export async function rotateGroupLink(secret: string): Promise<AdminResult> {
  await requireAdmin();

  const db = getDb();
  const next = generateGroupSecret();

  await db
    .update(groupSecrets)
    .set({ revokedAt: new Date() })
    .where(isNull(groupSecrets.revokedAt));
  await db.insert(groupSecrets).values({ secret: next });

  // The old path still renders for this Device — a revoked secret plus a valid
  // identity cookie is explicitly still allowed (ticket 04), which is what makes
  // rotation free for everyone who already installed the app.
  refresh(secret);
  return { ok: true, note: `New link: /g/${next}` };
}

/**
 * Send a note to every phone in the Group, right now.
 *
 * For the things the message calendar cannot know about — "there are new bits
 * in the app", "bring cash". Once per tap, no schedule, no ledger: it goes out
 * to everyone still in the Group who has notifications on, and that is all.
 */
export async function tellEveryone(
  secret: string,
  rawText: string,
): Promise<AdminResult> {
  await requireAdmin();

  const text = rawText.trim().replace(/\s+/g, " ");
  if (!text) return { ok: false, error: "Write something first." };
  if (text.length > 200) return { ok: false, error: "Keep it under 200 characters." };

  const devices = await getDb()
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(members, eq(members.id, pushSubscriptions.memberId))
    .where(isNull(members.archivedAt));

  if (devices.length === 0) {
    return { ok: false, error: "Nobody has notifications on yet." };
  }

  const { sent, removed } = await sendToSubscriptions(devices, {
    title: "Reso",
    body: text,
    url: `/g/${secret}`,
    tag: "note",
  });

  if (sent === 0) {
    return {
      ok: false,
      error:
        removed > 0
          ? "Every subscription had expired, so they have been cleared. People need to turn notifications on again."
          : "Apple refused it. Nothing was delivered.",
    };
  }

  return {
    ok: true,
    note: `Sent to ${sent} ${sent === 1 ? "phone" : "phones"}.`,
  };
}

/** The roster, for the panel. */
export async function roster() {
  return getDb()
    .select({
      id: members.id,
      name: members.name,
      isAdmin: members.isAdmin,
      firstClaimedAt: members.firstClaimedAt,
      archivedAt: members.archivedAt,
    })
    .from(members)
    .orderBy(asc(members.name));
}

/**
 * Send a notification to your own phones, and nobody else's.
 *
 * Web Push only works from the installed Home Screen app, and the only way to know
 * it really works is to make one arrive. Scoped to the Admin's own Devices so that
 * testing it never wakes the group.
 */
export async function sendTestPush(secret: string): Promise<AdminResult> {
  const admin = await requireAdmin();

  const devices = await getDb()
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.memberId, admin.id));

  if (devices.length === 0) {
    return {
      ok: false,
      error:
        "No phone has turned notifications on yet. Open Reso from the Home Screen and allow them.",
    };
  }

  const { sent, removed } = await sendToSubscriptions(devices, {
    title: "Reso works",
    body: "This is the notification you'll get when a month opens.",
    url: `/g/${secret}`,
    tag: "test",
  });

  if (sent === 0) {
    return {
      ok: false,
      error:
        removed > 0
          ? "That phone's subscription had expired, so it has been cleared. Turn notifications on again."
          : "Apple refused it. Nothing was delivered.",
    };
  }

  return {
    ok: true,
    note: `Sent to ${sent} ${sent === 1 ? "device" : "devices"}. It should arrive within a few seconds.`,
  };
}
