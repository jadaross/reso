import {
  announcementText,
  guestsPhrase,
  monthName,
  shortDate,
} from "@/lib/cycle/announcement";
import { headcount } from "@/lib/cycle/booking";
import type { Reveal as RevealData } from "@/lib/cycle/month-view";

import styles from "./reveal.module.css";
import { ShareButton } from "./share-button";
import { TicketControls } from "./ticket-controls";

const TIER_LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

/**
 * The month, once it is settled: the ticket.
 *
 * Whoever added the drawn place books it, and the ticket says so by name until
 * someone taps "I've booked it". Who is coming can still change until the night,
 * and the headcount follows — so a table booked for seven that is now eight is
 * shown as exactly that, rather than the booking quietly rewriting itself.
 */
export function Reveal({
  data,
  secret,
  isAdmin,
}: {
  data: RevealData;
  secret: string;
  isAdmin: boolean;
}) {
  const text = announcementText({
    month: data.month,
    kind: data.kind,
    chosenDate: data.chosenDate,
    place: data.place,
    area: data.area,
    tier: data.tier,
    going: data.going.length,
    guests: data.guests,
    tickets: data.tickets,
    pickedBy: data.pickedBy,
    bookedBy: data.bookedBy,
  });

  const heads = headcount(data.going, data.guests);
  const over = data.status === "done";

  if (!data.chosenDate) {
    return (
      <div className={styles.empty}>
        <strong>Nobody put any dates in for {monthName(data.month)}.</strong>
        {data.kind === "party"
          ? "So there is no dinner party to host."
          : "So there is nothing to book."}
      </div>
    );
  }

  if (data.kind === "restaurant" && !data.place) {
    return (
      <>
        <div className={styles.empty}>
          <strong>{shortDate(data.chosenDate)} works for most of you.</strong>
          Nothing was in the {TIER_LABEL[data.tier].toLowerCase()} list to draw
          from. Add some places and ask the Admin to draw.
        </div>
        {isAdmin ? <p className={styles.draft}>{text}</p> : null}
      </>
    );
  }

  const party = data.kind === "party";

  return (
    <>
      <div className={styles.ticket}>
        <div className={styles.stamp}>
          {party ? "DINNER PARTY" : TIER_LABEL[data.tier].toUpperCase()}
        </div>
        <div className={styles.month}>{monthName(data.month)}</div>
        <p className={styles.place}>{party ? "At someone’s" : data.place}</p>
        {party ? null : data.address ? (
          <p className={styles.address}>{data.address}</p>
        ) : null}
        {!party && data.pickedBy ? (
          <p className={styles.picked}>Picked by {data.pickedBy}</p>
        ) : null}

        <div className={styles.tear} />

        <div className={styles.facts}>
          <div>
            <span>Date</span>
            <strong>{shortDate(data.chosenDate)}</strong>
          </div>
          <div>
            <span>{over ? "Went" : party ? "Coming" : "Table for"}</span>
            <strong>{heads}</strong>
          </div>
          {over ? null : party ? (
            <div>
              <span>Host</span>
              <strong>Not yet</strong>
            </div>
          ) : (
            <div>
              <span>Booked</span>
              <strong className={data.bookedBy ? undefined : styles.pendingFact}>
                {data.bookedBy
                  ? `by ${data.bookedBy}`
                  : data.pickedBy
                    ? `${data.pickedBy}’s job`
                    : "Not yet"}
              </strong>
            </div>
          )}
        </div>
      </div>

      <p className={styles.going}>
        {over ? "Went" : "Going"}: {data.going.length > 0 ? data.going.join(", ") : "nobody yet"}
        {data.guests.length > 0 ? `, plus ${guestsPhrase(data.guests)}` : ""}.
      </p>

      {over ? null : (
        <TicketControls
          secret={secret}
          outingId={data.outingId}
          party={party}
          myGoing={data.myGoing}
          myPlusOne={data.myPlusOne}
          bookedBy={data.bookedBy}
          bookedFor={data.bookedFor}
          heads={heads}
        />
      )}

      {over ? null : <ShareButton text={text} outingId={data.outingId} />}

      {!over && !party && data.candidates > 0 ? (
        <p className={styles.why}>
          {data.tickets > 1
            ? `${data.tickets} of you had it down. `
            : ""}
          Drawn from {data.candidates}{" "}
          {data.candidates === 1 ? "ticket" : "tickets"}
          {data.rerolled ? ", after a redraw" : ""}.
        </p>
      ) : null}

      {isAdmin && !over ? <p className={styles.draft}>{text}</p> : null}
    </>
  );
}
