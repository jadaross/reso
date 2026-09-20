import { redirect } from "next/navigation";

import { loadEveryone } from "@/lib/cycle/advance";
import { todayInLondon } from "@/lib/cycle/dates";
import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Everyone } from "./everyone";

/**
 * When everyone is free, across the year ahead.
 *
 * Not about the dinner: the month screen does that. This is for the other things
 * a group of friends organises — a birthday, a weekend away — and it reads the
 * same taps, so nobody answers twice. Nothing on this page changes anyone's
 * answers.
 */
export default async function Free({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  const today = todayInLondon();
  const everyone = await loadEveryone(today);

  return (
    <>
      <h1 className={styles.title}>Who&rsquo;s free</h1>
      <p className={styles.lede}>
        Everyone&rsquo;s evenings, as far ahead as they&rsquo;ve said. Pick the
        people, then look for a night.
      </p>
      <Everyone data={everyone} me={member.id} today={today} />
    </>
  );
}
