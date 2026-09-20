import { redirect } from "next/navigation";

import { monthName, readableDate } from "@/lib/cycle/announcement";
import { loadVisits } from "@/lib/cycle/month-view";
import { currentMember } from "@/lib/identity/guard";

import { Eyebrow } from "../frame";
import styles from "../page.module.css";
import rows from "./history.module.css";

const TIER_LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

export default async function History({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();
  if (!member) redirect(`/g/${secret}`);

  const visits = await loadVisits();

  return (
    <>
      <Eyebrow text={visits.length === 1 ? "1 dinner" : `${visits.length} dinners`} />
      <h1 className={styles.title}>Where we&rsquo;ve been</h1>

      {visits.length === 0 ? (
        <p className={rows.empty}>
          Nothing yet. The first dinner shows up here the morning after.
        </p>
      ) : null}

      {visits.map((visit) => (
        <article key={visit.outingId} className={rows.visit}>
          <div className={rows.head}>
            <div>
              <h2 className={rows.place}>
                {visit.place ??
                  (visit.kind === "party" ? "Dinner party" : "No restaurant drawn")}
              </h2>
              <p className={rows.when}>
                {visit.chosenDate
                  ? readableDate(visit.chosenDate)
                  : monthName(visit.month)}
                {" · "}
                {visit.went} {visit.went === 1 ? "person" : "people"}
                {" · "}
                {TIER_LABEL[visit.tier]}
              </p>
            </div>
            <div className={rows.score}>
              {visit.averageScore === null ? (
                <span className={rows.unrated}>unrated</span>
              ) : (
                <>
                  <strong>{visit.averageScore.toFixed(1)}</strong>
                  <span>
                    from {visit.ratingCount}{" "}
                    {visit.ratingCount === 1 ? "person" : "people"}
                  </span>
                </>
              )}
            </div>
          </div>

          {visit.notes.length > 0 ? (
            <ul className={rows.notes}>
              {visit.notes.map((note) => (
                <li key={note.who}>
                  <span className={rows.noteWho}>
                    {note.who} &middot; {note.score}/5
                  </span>
                  {note.note}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </>
  );
}
