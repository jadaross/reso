import { redirect } from "next/navigation";

import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Shell } from "../shell";

export default async function History({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  return (
    <Shell secret={secret} member={member} section="history">
      {/* Visits, ratings and the record are ticket 14. */}
      <h1 className={styles.title}>History</h1>
      <div className={styles.placeholder}>
        <strong>Where we&rsquo;ve been lands next.</strong>
        Recording who came, rating the place out of five and listing past visits is
        ticket 14.
      </div>
    </Shell>
  );
}
