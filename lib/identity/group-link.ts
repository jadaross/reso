import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { groupSecrets } from "@/lib/db/schema";

export type GroupLinkState =
  /** A live Group Link. */
  | "ok"
  /** A Group Link that has been rotated away. */
  | "revoked"
  /** Never issued by us. */
  | "unknown";

/**
 * The Group Link is only a bootstrap credential (ticket 04). A Device that has
 * already claimed a name carries its identity cookie, and that cookie — not the
 * secret — is what keeps it in. So rotating a leaked link costs nothing for the
 * Members who already have Reso installed, and only shuts out the leaker and
 * anyone who has not opened it yet.
 *
 * The rule this implements:
 *   live secret                        -> in
 *   revoked secret + identity cookie   -> in
 *   revoked secret, no identity cookie -> out
 *   unknown secret                     -> out
 */
export async function checkGroupSecret(secret: string): Promise<GroupLinkState> {
  const [row] = await getDb()
    .select({ revokedAt: groupSecrets.revokedAt })
    .from(groupSecrets)
    .where(eq(groupSecrets.secret, secret))
    .limit(1);

  if (!row) return "unknown";
  return row.revokedAt ? "revoked" : "ok";
}
