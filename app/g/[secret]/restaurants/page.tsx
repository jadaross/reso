import { redirect } from "next/navigation";

import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Shell } from "../shell";

export default async function Restaurants({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  return (
    <Shell secret={secret} member={member} section="restaurants">
      {/* The list and the add form are ticket 12. */}
      <h1 className={styles.title}>Restaurants</h1>
      <div className={styles.placeholder}>
        <strong>Adding places lands next.</strong>
        Typing a name or pasting a Maps link, and splitting the list into this
        month&rsquo;s tier and the rest, is ticket 12.
      </div>
    </Shell>
  );
}
