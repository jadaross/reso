import { asc, isNull } from "drizzle-orm";

import { EnablePush } from "@/components/enable-push";
import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import { claimNameForm } from "./actions";
import styles from "./page.module.css";
import { BareShell, Shell } from "./shell";

export default async function GroupHome({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();

  if (!member) return <PickYourName secret={secret} />;

  return (
    <Shell secret={secret} member={member} section="month">
      {/* The month itself is ticket 11 (the calendar) and ticket 13 (the reveal). */}
      <h1 className={styles.title}>This month</h1>
      <div className={styles.placeholder}>
        <strong>The calendar lands next.</strong>
        Tapping the evenings you can do, and seeing how many of the group can do
        each one, is ticket 11. The reveal is ticket 13.
      </div>
      <EnablePush />
    </Shell>
  );
}

async function PickYourName({ secret }: { secret: string }) {
  const roster = await getDb()
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(isNull(members.archivedAt))
    .orderBy(asc(members.name));

  return (
    <BareShell>
      <h1 className={styles.title}>Who are you?</h1>
      {roster.length === 0 ? (
        <p className={styles.empty}>
          Nobody has been added to the group yet. Whoever set Reso up needs to add
          the names first.
        </p>
      ) : (
        roster.map((person) => (
          <form action={claimNameForm} key={person.id}>
            <input type="hidden" name="secret" value={secret} />
            <input type="hidden" name="memberId" value={person.id} />
            <button type="submit" className={styles.stub}>
              {person.name}
            </button>
          </form>
        ))
      )}
      <p className={styles.note}>
        Tap your name once and this phone will remember it. If you add Reso to your
        Home Screen afterwards, tap it once more inside the app.
      </p>
    </BareShell>
  );
}
