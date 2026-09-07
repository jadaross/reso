import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { members, type Member } from "@/lib/db/schema";

import { currentMemberId } from "./session";

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
 * Admin authority is the flag on the Member, and nothing else.
 *
 * There was a Group-wide PIN on top of this. Jada asked for it to go: she could not
 * remember it, and a lock whose key gets forgotten is a lock on the wrong person.
 * The trade is real and worth stating — anyone holding the Group Link can now tap
 * "Jada" on the pick-your-name screen and have the Admin panel. The Group Link is
 * the only gate left, which is the same gate everything else in Reso sits behind.
 */
export async function currentAdmin(): Promise<Member | null> {
  const member = await currentMember();
  return member?.isAdmin ? member : null;
}

export async function requireAdmin(): Promise<Member> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("Admin unlock required");
  return admin;
}
