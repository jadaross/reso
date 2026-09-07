"use server";

import { getDb } from "@/lib/db";
import { sentMessages } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

/**
 * Record that the announcement reached the group chat.
 *
 * The site cannot see into WhatsApp, so this is the only evidence that the message
 * was actually forwarded — without it the day-after nudge would either never fire
 * or fire at an Admin who has already done it. Stored as a `sent_messages` row so
 * it shares the once-per-Outing key with everything else.
 */
export async function markShared(outingId: string): Promise<void> {
  const member = await currentMember();
  if (!member) return;

  await getDb()
    .insert(sentMessages)
    .values({ outingId, kind: "shared" })
    .onConflictDoNothing();
}
