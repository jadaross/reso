import { announcementText, monthName, shortDate } from "@/lib/cycle/announcement";
import type { Reveal as RevealData } from "@/lib/cycle/month-view";
import { formatPriceTier } from "@/lib/cycle/tier";

import { DrawnFrom } from "./drawn-from";
import styles from "./reveal.module.css";
import { ShareButton } from "./share-button";
import { Going, GoingPeople, Headcount } from "./ticket-controls";

/**
 * The month, once it is settled: the ticket.
 *
 * Whoever added the drawn place books it. Until someone taps "I've booked it"
 * the ticket says so as "Jada's ticket · Jada books". Who is coming is a row of
 * chips, and the headcount follows a tap at once — a table booked for seven
 * that is now eight is shown as exactly that.
 */
export function Reveal({
  data,
  secret,
  isAdmin,
  underControls,
}: {
  data: RevealData;
  secret: string;
  isAdmin: boolean;
  /** The open month's ask. It sits directly under the ticket's controls. */
  underControls?: React.ReactNode;
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

  const over = data.status === "done";

  if (!data.chosenDate) {
    return (
      <>
        <div className={styles.empty}>
          <strong>Nobody put any dates in for {monthName(data.month)}.</strong>
          {data.kind === "party"
            ? "So there is no dinner party to host."
            : "So there is nothing to book."}
        </div>
        {underControls}
      </>
    );
  }

  if (data.kind === "restaurant" && !data.place) {
    return (
      <>
        <div className={styles.empty}>
          <strong>{shortDate(data.chosenDate)} works for most of you.</strong>
          Nothing was in the {formatPriceTier(data.tier)} list to draw
          from. Add some places and ask the Admin to draw.
        </div>
        {isAdmin ? <p className={styles.draft}>{text}</p> : null}
        {underControls}
      </>
    );
  }

  const party = data.kind === "party";
  const seatKey = data.seats
    .map((seat) => `${seat.id}:${seat.answer}:${seat.plusOne ? 1 : 0}`)
    .join(".");

  return (
    <Going
      key={`${data.outingId}|${data.bookedBy ?? ""}|${data.bookedFor ?? ""}|${data.viewerDays.join(",")}|${seatKey}`}
      secret={secret}
      outingId={data.outingId}
      chosenDate={data.chosenDate}
      viewerId={data.viewerId}
      viewerDays={data.viewerDays}
      seats={data.seats}
      bookedBy={data.bookedBy}
      bookedByMe={data.bookedByMe}
      bookedFor={data.bookedFor}
      party={party}
      over={over}
    >
      <div className={styles.ticket}>
        <div className={styles.stamp}>
          {party ? "DINNER PARTY" : formatPriceTier(data.tier)}
        </div>
        <div className={styles.month}>{monthName(data.month)}</div>
        <p className={styles.place}>{party ? "At someone’s" : data.place}</p>
        {party ? null : data.address ? (
          <p className={styles.address}>{data.address}</p>
        ) : null}
        {!party && data.pickedBy ? (
          <p className={styles.picked}>
            {over || data.bookedBy
              ? `${data.pickedBy}’s ticket`
              : `${data.pickedBy}’s ticket · ${data.pickedBy} books`}
          </p>
        ) : null}

        <div className={styles.tear} />

        <div className={styles.facts}>
          <div>
            <span>Date</span>
            <strong>{shortDate(data.chosenDate)}</strong>
          </div>
          <div>
            <span>{over ? "Went" : party ? "Coming" : "Table for"}</span>
            <strong>
              <Headcount />
            </strong>
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
                {data.bookedBy ? `Yes, by ${data.bookedBy}` : "No"}
              </strong>
            </div>
          )}
        </div>
      </div>

      <GoingPeople />

      {underControls}

      {over || !isAdmin ? null : <ShareButton text={text} outingId={data.outingId} />}

      {!over && !party ? (
        <DrawnFrom tickets={data.hat} rerolled={data.rerolled} />
      ) : null}
    </Going>
  );
}
