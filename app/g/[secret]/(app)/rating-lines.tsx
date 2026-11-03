import { shownRatings, type RatedMember, type ShownRating } from "@/lib/cycle/rating";

import rows from "./past/history.module.css";
import styles from "./rate.module.css";

/** Every Rating on a Visit: a name, and the Note when they left one. */
export function RatingNames({ lines }: { lines: ShownRating[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className={rows.notes}>
      {lines.map((line) => (
        <li key={line.memberId}>
          <span className={rows.noteWho}>
            {line.who} · {line.score}/5
          </span>
          {line.quote}
        </li>
      ))}
    </ul>
  );
}

/**
 * The scores anyone can read. No stars to tap: that control belongs to the
 * Members who were there, and only to them.
 */
export function VisitScores({
  average,
  ratings,
}: {
  average: number | null;
  ratings: RatedMember[];
}) {
  const shown = shownRatings(ratings);
  if (shown.lines.length === 0 || average === null) return null;
  return (
    <section className={styles.readout} aria-label="Ratings">
      <p className={styles.average}>
        <strong>{average.toFixed(1)}</strong>
        <span>from {shown.peopleLabel}</span>
      </p>
      <RatingNames lines={shown.lines} />
    </section>
  );
}
