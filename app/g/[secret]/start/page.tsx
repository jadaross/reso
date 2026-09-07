import { redirect } from "next/navigation";

import { currentMember } from "@/lib/identity/guard";

import { Setup } from "./setup";
import styles from "./start.module.css";

/**
 * Where a Member lands the moment they pick their name.
 *
 * Deliberately outside the app shell: there is no bottom navigation here, because
 * there is exactly one thing to do and everything else can wait twenty seconds.
 */
export default async function Start({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  return (
    <main className={styles.page}>
      <Setup secret={secret} name={member.name} />
    </main>
  );
}
