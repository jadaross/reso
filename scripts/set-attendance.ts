/**
 * Correct who went to a past dinner, after the morning-after freeze got it wrong.
 *
 *   node --env-file=.env.local --import tsx scripts/set-attendance.ts --place "Zeze"
 *   node --env-file=.env.local --import tsx scripts/set-attendance.ts --place "Zeze" \
 *     --except "Jack" --no-guests --apply
 *
 * Without --apply it only prints the Visit as it stands. --except takes the names
 * who did NOT go; everyone else active in the Group is marked as there. --went
 * takes the names who DID go instead. --no-guests clears every Plus-one on it.
 */
import { and, eq, ilike, inArray, isNull } from "drizzle-orm";

import { getDb } from "../lib/db";
import { attendance, members, outings, picks, plusOnes } from "../lib/db/schema";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);
const names = (value: string | undefined) =>
  (value ?? "").split(",").map((each) => each.trim()).filter(Boolean);

async function main() {
  const place = arg("place");
  if (!place) {
    console.error("Usage: --place <part of the name> [--except A,B | --went A,B] [--no-guests] [--apply]");
    process.exit(1);
  }
  const db = getDb();

  const found = await db
    .select({ id: outings.id, month: outings.month, chosenDate: outings.chosenDate, place: picks.name })
    .from(outings)
    .innerJoin(picks, eq(picks.id, outings.drawnPickId))
    .where(and(eq(outings.status, "done"), ilike(picks.name, `%${place}%`)));
  if (found.length !== 1) {
    console.error(`${found.length} done Outings match "${place}":`, found);
    process.exit(1);
  }
  const [visit] = found;

  const roster = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(isNull(members.archivedAt))
    .orderBy(members.name);
  const byName = new Map(roster.map((row) => [row.name.toLowerCase(), row]));
  const went = await db
    .select({ name: members.name })
    .from(attendance)
    .innerJoin(members, eq(members.id, attendance.memberId))
    .where(eq(attendance.outingId, visit.id));
  const guests = await db
    .select({ name: members.name })
    .from(plusOnes)
    .innerJoin(members, eq(members.id, plusOnes.memberId))
    .where(eq(plusOnes.outingId, visit.id));

  console.log(`${visit.place} · ${visit.month} · ${visit.chosenDate}`);
  console.log(`Now went:   ${went.map((row) => row.name).join(", ") || "nobody"}`);
  console.log(`Now guests: ${guests.map((row) => row.name).join(", ") || "none"}`);
  console.log(`Roster:     ${roster.map((row) => row.name).join(", ")}`);

  const except = names(arg("except"));
  const only = names(arg("went"));
  let next: { id: string; name: string }[] | null = null;
  if (except.length > 0) {
    const out = new Set(except.map((name) => name.toLowerCase()));
    for (const name of out) if (!byName.has(name)) throw new Error(`No Member called ${name}`);
    next = roster.filter((row) => !out.has(row.name.toLowerCase()));
  } else if (only.length > 0) {
    next = only.map((name) => {
      const row = byName.get(name.toLowerCase());
      if (!row) throw new Error(`No Member called ${name}`);
      return row;
    });
  }

  if (next) console.log(`Will went:  ${next.map((row) => row.name).join(", ")}`);
  if (flag("no-guests")) console.log("Will guests: none");

  if (!flag("apply")) {
    console.log("Dry run. Add --apply to write it.");
    return;
  }

  if (next) {
    await db.delete(attendance).where(eq(attendance.outingId, visit.id));
    await db
      .insert(attendance)
      .values(next.map((row) => ({ outingId: visit.id, memberId: row.id })))
      .onConflictDoNothing();
    // A Plus-one belongs to someone who went; drop any whose host did not.
    await db.delete(plusOnes).where(
      and(
        eq(plusOnes.outingId, visit.id),
        inArray(plusOnes.memberId, roster.filter((row) => !next.some((n) => n.id === row.id)).map((row) => row.id)),
      ),
    );
  }
  if (flag("no-guests")) {
    await db.delete(plusOnes).where(eq(plusOnes.outingId, visit.id));
  }
  console.log("Written.");
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
