import { redirect } from "next/navigation";

import { shortDate } from "@/lib/cycle/announcement";
import { loadEveryone, loadYear } from "@/lib/cycle/advance";
import { todayInLondon } from "@/lib/cycle/dates";
import { loadMonthView, openOuting } from "@/lib/cycle/month-view";
import { currentMember } from "@/lib/identity/guard";

import { Eyebrow } from "../frame";
import { InTheRunning } from "../in-the-running";
import { Dates } from "./dates";

/**
 * Every calendar in one place: this month's dinner, the year ahead, and who
 * else is free when. One list of months, two ways of reading it — your own
 * evenings, which you tap, and everyone's, which you look at.
 */
export default async function DatesPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  const today = todayInLondon();
  const [months, everyone, open] = await Promise.all([
    loadYear(member.id, today),
    loadEveryone(today),
    openOuting(),
  ]);
  const view = open ? await loadMonthView(open, member.id) : null;

  return (
    <>
      <Eyebrow text={view ? `${shortDate(view.closeDay)} close` : ""} />
      <Dates
        secret={secret}
        me={member.id}
        today={today}
        people={everyone.people}
        free={everyone.free}
        months={months}
        open={
          view
            ? {
                month: view.month,
                closeDay: view.closeDay,
                myPlusOne: view.myPlusOne,
                standing: standing(view),
                running: (
                  <InTheRunning
                    leaders={view.leaders}
                    whoByDay={view.whoByDay}
                    answered={view.answeredNames}
                    silent={view.silentNames}
                    memberCount={view.memberCount}
                  />
                ),
              }
            : null
        }
      />
    </>
  );
}

/** Where the open month has got to, in one line. */
function standing(view: Awaited<ReturnType<typeof loadMonthView>>): string {
  const leader = view.leaders[0];
  const waiting =
    view.silentCount === 0
      ? "Everyone has answered."
      : `${view.silentCount} of ${view.memberCount} ${
          view.silentCount === 1 ? "hasn’t" : "haven’t"
        } answered.`;
  if (!leader) return `Nobody has tapped an evening yet. ${waiting}`;
  return `${shortDate(leader.day)} leads, ${leader.count} of ${view.memberCount}. ${waiting}`;
}
