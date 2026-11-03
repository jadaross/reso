import Link from "next/link";
import { redirect } from "next/navigation";

import { SetupPage } from "@/components/device-setup";
import { currentMember } from "@/lib/identity/guard";

import styles from "./start.module.css";

/**
 * A direct visit to the old setup URL.
 *
 * Picking a name no longer lands here. The URL stays so a bookmark still shows
 * the notifications and install steps, rather than bouncing back to Dinner.
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
      <Link href={`/g/${secret}`} className={styles.back}>
        Dinner
      </Link>
      <SetupPage secret={secret} />
    </main>
  );
}
