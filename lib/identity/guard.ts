import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { members, type Member } from "@/lib/db/schema";

import { currentMemberId, hasAdminUnlock } from "./session";

/**
 * The Member this Device is, or null.
 *
 * Archived Members resolve to null: removal takes the name out of circulation, so
 * their Devices fall back to the pick-your-name screen on next open.
 */
export async function currentMember(): Promise<Member | null> {
  const id = await currentMemberId();
  if (!id) return null;

  const [member] = await getDb()
    .select()
    .from(members)
    .where(and(eq(members.id, id), isNull(members.archivedAt)))
    .limit(1);

  return member ?? null;
}

/**
 * Admin authority is two things at once: the Member is flagged as an Admin, and
 * this Device has entered the PIN recently. Neither alone is enough — the flag
 * only decides whether the app offers the prompt.
 */
export async function currentAdmin(): Promise<Member | null> {
  const member = await currentMember();
  if (!member?.isAdmin) return null;
  return (await hasAdminUnlock()) ? member : null;
}

export async function requireAdmin(): Promise<Member> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("Admin unlock required");
  return admin;
}
