/**
 * Bootstrap a fresh Reso database: the Admin PIN, the first Group Link, and the
 * first Member (an Admin, so someone can add everyone else).
 *
 *   pnpm exec tsx scripts/seed.ts --admin "Jada" --pin 481625
 *
 * Safe to re-run: it will not create a second settings row or a second Member with
 * the same name, and it prints the live Group Link either way.
 */
import { eq } from "drizzle-orm";

import { getDb } from "../lib/db";
import { groupSecrets, groupSettings, members } from "../lib/db/schema";
import { hashPin } from "../lib/identity/pin";
import { generateGroupSecret } from "../lib/identity/token";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const adminName = arg("admin");
  const pin = arg("pin");

  if (!adminName || !pin) {
    console.error('Usage: tsx scripts/seed.ts --admin "Name" --pin 481625');
    process.exit(1);
  }

  if (!/^\d{4,10}$/.test(pin)) {
    console.error("The PIN should be 4 to 10 digits.");
    process.exit(1);
  }

  const db = getDb();

  await db
    .insert(groupSettings)
    .values({ id: 1, adminPinHash: await hashPin(pin) })
    .onConflictDoUpdate({
      target: groupSettings.id,
      set: { adminPinHash: await hashPin(pin), updatedAt: new Date() },
    });

  const [existingAdmin] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.name, adminName))
    .limit(1);

  if (!existingAdmin) {
    await db.insert(members).values({ name: adminName, isAdmin: true });
  }

  const live = await db
    .select({ secret: groupSecrets.secret, revokedAt: groupSecrets.revokedAt })
    .from(groupSecrets);

  let secret = live.find((row) => row.revokedAt === null)?.secret;
  if (!secret) {
    secret = generateGroupSecret();
    await db.insert(groupSecrets).values({ secret });
  }

  console.log(`\nAdmin:      ${adminName}`);
  console.log(`Group Link: /g/${secret}`);
  console.log("\nShare that path on the end of the site's URL. Everyone opens it,");
  console.log("taps their name, then adds Reso to their Home Screen.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
