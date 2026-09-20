import Link from "next/link";
import { redirect } from "next/navigation";

import { loadYear } from "@/lib/cycle/advance";
import { todayInLondon } from "@/lib/cycle/dates";
import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Shell } from "../shell";
import settings from "./settings.module.css";
import { Year } from "./year";

export default async function Settings({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  const months = await loadYear(member.id, todayInLondon());

  return (
    <Shell secret={secret} member={member} section="settings">
      <h1 className={styles.title}>Your year</h1>
      <p className={styles.lede}>
        Tap the evenings you already know you can do, as far ahead as you like.
        They&rsquo;re filled in for you the moment each month opens, and you can
        still change them until it closes.
      </p>

      <Year secret={secret} months={months} />

      <section className={settings.section}>
        <h2 className={settings.heading}>Your phone</h2>
        <p className={settings.hint}>
          Reminders only reach a phone that has Reso on its Home Screen with
          notifications on.
        </p>
        <Link className={settings.link} href={`/g/${secret}/start`}>
          Check the setup
        </Link>
      </section>
    </Shell>
  );
}
