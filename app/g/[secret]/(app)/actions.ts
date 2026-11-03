"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { members, pushSubscriptions } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";
import { claimMember, releaseMember } from "@/lib/identity/session";
import { sendToSubscriptions } from "@/lib/push/send";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Claim a name on this Device.
 *
 * Names are not exclusive (ticket 04): a Member may have a phone and an iPad, and
 * phones get replaced. A claim answers "who is this Device", it is not a lock, so
 * there is nothing here to reject.
 */
export async function claimName(
  secret: string,
  memberId: string,
): Promise<ActionResult> {
  const db = getDb();

  const [member] = await db
    .select({ id: members.id, firstClaimedAt: members.firstClaimedAt })
    .from(members)
    .where(and(eq(members.id, memberId), isNull(members.archivedAt)))
    .limit(1);

  if (!member) return { ok: false, error: "That name is no longer in the group." };

  // Shown to the Admin as a "not opened yet" marker, so only the first claim counts.
  if (!member.firstClaimedAt) {
    await db
      .update(members)
      .set({ firstClaimedAt: new Date() })
      .where(eq(members.id, member.id));
  }

  await claimMember(member.id);
  revalidatePath(`/g/${secret}`);
  return { ok: true };
}

/** "Not you?" — one tap, no confirmation. */
export async function switchName(secret: string): Promise<ActionResult> {
  await releaseMember();
  revalidatePath(`/g/${secret}`);
  return { ok: true };
}


/* Form-bound wrappers, so the screens work without any client-side JavaScript. */

export async function claimNameForm(formData: FormData): Promise<void> {
  const secret = String(formData.get("secret") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const result = await claimName(secret, memberId);
  // Dinner, for a first claim and a returning Member alike. Install and
  // notifications sit on that screen; a setup page in between is what made
  // people hunt for the way out, and what re-onboarded someone who already knew.
  if (result.ok) redirect(`/g/${secret}`);
}

export type SelfTestResult =
  | { ok: true; note: string }
  | { ok: false; error: string };

/**
 * A notification to this Member's own Devices, and nobody else's.
 *
 * The only way to know push is actually arriving is to send one. Scoped to the
 * Member holding this Device so trying it never wakes the rest of the Group.
 */
export async function sendMyselfATest(secret: string): Promise<SelfTestResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Pick your name first." };

  const devices = await getDb()
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.memberId, member.id));

  if (devices.length === 0) {
    return { ok: false, error: "Turn notifications on first." };
  }

  const { sent, removed } = await sendToSubscriptions(devices, {
    title: "Reso",
    body: "This is a test. You'll hear from Reso when a month opens.",
    url: `/g/${secret}`,
    tag: "test",
  });

  if (sent === 0) {
    return {
      ok: false,
      error:
        removed > 0
          ? "That subscription had expired. Turn notifications on again."
          : "Nothing was delivered.",
    };
  }

  return { ok: true, note: "Sent." };
}

export async function switchNameForm(formData: FormData): Promise<void> {
  await switchName(String(formData.get("secret") ?? ""));
}
