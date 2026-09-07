import { asc, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";

import { EnablePush } from "@/components/enable-push";

import { claimNameForm, switchNameForm } from "./actions";

/*
 * PLACEHOLDER UI.
 *
 * The look and feel is still an open decision (wayfinder ticket 06), so this is
 * deliberately unstyled: it proves the identity flow end to end and gives the
 * prototype something to replace. Behaviour here is settled; appearance is not.
 */

export default async function GroupHome({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();

  if (!member) {
    const roster = await getDb()
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(isNull(members.archivedAt))
      .orderBy(asc(members.name));

    return (
      <main>
        <h1>Who are you?</h1>
        {roster.length === 0 ? (
          <p>Nobody has been added to the group yet.</p>
        ) : (
          <ul>
            {roster.map((person) => (
              <li key={person.id}>
                <form action={claimNameForm}>
                  <input type="hidden" name="secret" value={secret} />
                  <input type="hidden" name="memberId" value={person.id} />
                  <button type="submit">{person.name}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>Reso</h1>
      {/* The current name stays permanently visible so a wrong pick is noticed
          in seconds rather than at Close Day. */}
      <div>
        You are <strong>{member.name}</strong>.{" "}
        <form action={switchNameForm} style={{ display: "inline" }}>
          <input type="hidden" name="secret" value={secret} />
          <button type="submit">Not you?</button>
        </form>
      </div>
      <p>This month&rsquo;s Outing will appear here.</p>
      <EnablePush />
    </main>
  );
}
