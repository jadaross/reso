"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { claimMember, releaseMember } from "@/lib/identity/session";

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
  await claimName(secret, memberId);
}

export async function switchNameForm(formData: FormData): Promise<void> {
  await switchName(String(formData.get("secret") ?? ""));
}
