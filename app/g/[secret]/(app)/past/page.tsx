import { redirect } from "next/navigation";

import { monthName, shortDate } from "@/lib/cycle/announcement";
import { loadVisits } from "@/lib/cycle/month-view";
import { shownRatings } from "@/lib/cycle/rating";
import { formatPriceTier } from "@/lib/cycle/tier";
import { currentMember } from "@/lib/identity/guard";

import styles from "../page.module.css";
import { Rate } from "../rate";
import { RatingNames } from "../rating-lines";
import ticket from "../reveal.module.css";
import rows from "./history.module.css";

/**
 * Everywhere the Group has been, newest first, each as the ticket it was: the
 * same stub Dinner showed that month, smaller, with the score where the booking
 * used to be. For anyone who was there, the stars sit right under it. The rating
 * used to live only on the month screen the morning after, which the next
 * month's calendar had usually pushed off by then; here it stays until given.
 */
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
      <h1 className={styles.headline}>
        Where we&rsquo;ve been
        <span className={styles.headlineNote}>
          {visits.length === 1 ? "1 dinner" : `${visits.length} dinners`}
        </span>
      </h1>

      {visits.length === 0 ? (
        <p className={rows.empty}>
          Nothing yet. The first dinner shows up here the morning after.
        </p>
      ) : null}

      {visits.map((visit) => {
        const went = visit.attendees.includes(member.id);
        const mine = visit.ratings.find((row) => row.memberId === member.id) ?? null;
        const shown = shownRatings(visit.ratings);
        const label =
          visit.place ?? (visit.kind === "party" ? "the dinner party" : monthName(visit.month));

        const party = visit.kind === "party";
        const people = `${visit.went}${visit.guests > 0 ? ` + ${visit.guests}` : ""}`;

        return (
          <article key={visit.outingId} className={rows.visit}>
            <div className={`${ticket.ticket} ${rows.ticket}`}>
              <div className={ticket.stamp}>
                {party ? "DINNER PARTY" : formatPriceTier(visit.tier)}
              </div>
              <div className={ticket.month}>{monthName(visit.month)}</div>
              <h2 className={`${ticket.place} ${rows.place}`}>
                {visit.place ?? (party ? "At someone’s" : "No restaurant drawn")}
              </h2>
              {!party && visit.address ? (
                <p className={ticket.address}>{visit.address}</p>
              ) : null}
              {!party && visit.pickedBy ? (
                <p className={ticket.picked}>{visit.pickedBy}’s ticket</p>
              ) : null}

              <div className={ticket.tear} />

              <div className={ticket.facts}>
                <div>
                  <span>Date</span>
                  <strong>{visit.chosenDate ? shortDate(visit.chosenDate) : "None"}</strong>
                </div>
                <div>
                  <span>Went</span>
                  <strong>{people}</strong>
                </div>
                <div>
                  <span>Score</span>
                  {shown.lines.length === 0 || visit.averageScore === null ? (
                    <strong className={ticket.pendingFact}>Unrated</strong>
                  ) : (
                    <strong>
                      {visit.averageScore.toFixed(1)}
                      <small className={rows.from}> from {shown.peopleLabel}</small>
                    </strong>
                  )}
                </div>
              </div>
            </div>

            {went ? (
              <Rate
                secret={secret}
                outingId={visit.outingId}
                place={label}
                existing={mine ? { score: mine.score, note: mine.note } : null}
                compact
              />
            ) : null}

            <RatingNames lines={shown.lines} />
          </article>
        );
      })}
    </>
  );
}
