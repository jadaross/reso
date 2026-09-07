"use server";

import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { closeDueOutings } from "@/lib/cycle/close";
import { drawFrom } from "@/lib/cycle/draw";
import { getDb } from "@/lib/db";
import {
  attendance,
  availability,
  draws,
  members,
  outings,
  picks,
  pushSubscriptions,
  type PriceTier,
} from "@/lib/db/schema";
import { sendToSubscriptions } from "@/lib/push/send";
import { requireAdmin } from "@/lib/identity/guard";
import { generateGroupSecret } from "@/lib/identity/token";
import { groupSecrets } from "@/lib/db/schema";

export type AdminResult = { ok: true; note?: string } | { ok: false; error: string };

function refresh(secret: string) {
  revalidatePath(`/g/${secret}`);
  revalidatePath(`/g/${secret}/admin`);
  revalidatePath(`/g/${secret}/restaurants`);
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
    return { ok: true, note: `${name} is back in.` };
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
    return { ok: false, error: "You can't remove yourself." };
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

  await db
    .update(members)
    .set({ archivedAt: new Date() })
    .where(eq(members.id, memberId));

  refresh(secret);
  return { ok: true, note: "Archived. Their picks and past dinners are kept." };
}

/** Override this month's Price Tier — a birthday can be expensive out of turn. */
export async function overrideTier(
  secret: string,
  outingId: string,
  tier: PriceTier,
): Promise<AdminResult> {
  await requireAdmin();

  await getDb()
    .update(outings)
    .set({ tier, tierOverridden: true })
    .where(eq(outings.id, outingId));

  refresh(secret);
  return { ok: true, note: `This month is now ${tier}.` };
}

/** Pick a different day from the top few, when the arithmetic misses something. */
export async function overrideChosenDate(
  secret: string,
  outingId: string,
  day: string,
): Promise<AdminResult> {
  await requireAdmin();

  const db = getDb();
  await db
    .update(outings)
    .set({ chosenDate: day, chosenDateOverridden: true })
    .where(eq(outings.id, outingId));

  // Who is going follows the date, so it is rebuilt rather than left stale.
  const [outing] = await db
    .select({ status: outings.status })
    .from(outings)
    .where(eq(outings.id, outingId))
    .limit(1);

  if (outing?.status !== "open") {
    const free = await db
      .select({ memberId: availability.memberId })
      .from(availability)
      .innerJoin(members, eq(members.id, availability.memberId))
      .where(
        and(
          eq(availability.outingId, outingId),
          eq(availability.day, day),
          isNull(members.archivedAt),
        ),
      );

    await db.delete(attendance).where(eq(attendance.outingId, outingId));
    if (free.length > 0) {
      await db
        .insert(attendance)
        .values(free.map((row) => ({ outingId, memberId: row.memberId })))
        .onConflictDoNothing();
    }
  }

  refresh(secret);
  return { ok: true, note: "Date changed, and who's going with it." };
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
    .select({ id: outings.id, tier: outings.tier, drawnPickId: outings.drawnPickId })
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

  // Everything in the tier except the place that just failed.
  const candidates = await db
    .select({ id: picks.id })
    .from(picks)
    .innerJoin(members, eq(members.id, picks.memberId))
    .where(
      outing.drawnPickId
        ? and(eq(picks.tier, outing.tier), ne(picks.id, outing.drawnPickId))
        : eq(picks.tier, outing.tier),
    );

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
  });

  refresh(secret);
  return { ok: true, note: "Redrawn. Everyone can see it was a second go." };
}

/** Close Availability early, once everyone is in. Runs the same path as Close Day. */
export async function closeEarly(secret: string): Promise<AdminResult> {
  await requireAdmin();

  // closeDueOutings closes anything whose Close Day has passed, so handing it a
  // date far enough ahead runs exactly the same code the cron runs, rather than a
  // second implementation that could drift from it.
  const results = await closeDueOutings("2999-12-31");
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

/** The roster, for the panel. */
export async function roster() {
  return getDb()
    .select({
      id: members.id,
      name: members.name,
      isAdmin: members.isAdmin,
      firstClaimedAt: members.firstClaimedAt,
    })
    .from(members)
    .where(isNull(members.archivedAt))
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
