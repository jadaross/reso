import {
  announcementText,
  monthName,
  readableDate,
  shortDate,
} from "@/lib/cycle/announcement";
import type { Reveal as RevealData } from "@/lib/cycle/month-view";

import styles from "./reveal.module.css";
import { ShareButton } from "./share-button";

const TIER_LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

/**
 * The month, once it is settled.
 *
 * The one thing this screen must never do is let the group think the table is
 * booked. Nobody books a restaurant automatically, so it says so, every time,
 * until someone marks it done.
 */
export function Reveal({
  data,
  isAdmin,
}: {
  data: RevealData;
  isAdmin: boolean;
}) {
  const text = announcementText({
    month: data.month,
    chosenDate: data.chosenDate,
    place: data.place,
    area: data.area,
    tier: data.tier,
    going: data.going.length,
    plusOnes: data.plusOnes,
    tickets: data.tickets,
  });

  if (!data.place) {
    return (
      <>
        <div className={styles.empty}>
          <strong>
            {data.chosenDate
              ? `${readableDate(data.chosenDate)} works for most of you.`
              : "Nobody put any dates in."}
          </strong>
          {data.chosenDate
            ? `There was nothing in the ${TIER_LABEL[data.tier].toLowerCase()} list to draw from, so there is no restaurant. Add some and ask Jada to draw again.`
            : "Without any dates there is nothing to book."}
        </div>
        <p className={styles.draft}>{text}</p>
      </>
    );
  }

  const heads = data.going.length + data.plusOnes;

  return (
    <>
      <div className={styles.ticket}>
        <div className={styles.stamp}>{TIER_LABEL[data.tier].toUpperCase()}</div>
        <div className={styles.month}>{monthName(data.month)}</div>
        <p className={styles.place}>{data.place}</p>
        {data.address ? <p className={styles.address}>{data.address}</p> : null}

        <div className={styles.tear} />

        <div className={styles.facts}>
          <div>
            <span>Date</span>
            <strong>
              {data.chosenDate ? shortDate(data.chosenDate) : "not set"}
            </strong>
          </div>
          <div>
            <span>Table for</span>
            <strong>{heads}</strong>
          </div>
          <div>
            <span>Booked</span>
            <strong>Not yet</strong>
          </div>
        </div>
      </div>

      <ShareButton text={text} />

      <p className={styles.why}>
        {data.tickets > 1
          ? `${data.tickets} of you had this one down, so it went into the draw ${data.tickets} times. `
          : ""}
        Drawn from {data.candidates}{" "}
        {data.candidates === 1 ? "ticket" : "tickets"} in the{" "}
        {TIER_LABEL[data.tier].toLowerCase()} list
        {data.rerolled ? ", after a redraw" : ""}. Someone still needs to book it.
      </p>

      {data.going.length > 0 ? (
        <p className={styles.why}>
          Going: {data.going.join(", ")}
          {data.plusOnes > 0
            ? `, plus ${data.plusOnes} ${data.plusOnes === 1 ? "guest" : "guests"}`
            : ""}
          .
        </p>
      ) : null}

      {isAdmin ? <p className={styles.draft}>{text}</p> : null}
    </>
  );
}
