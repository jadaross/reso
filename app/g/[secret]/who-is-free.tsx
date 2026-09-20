import { shortDate } from "@/lib/cycle/announcement";

import styles from "./who-is-free.module.css";

/**
 * Who can make which evening, by name.
 *
 * The calendar's bars say how many; this says who, which is what people actually
 * want to know before they tap — whether the evening that is leading is one their
 * closest friends can do, and who still has not said. Only evenings somebody has
 * tapped are listed, so the section is as long as the answers and no longer.
 */
export function WhoIsFree({
  whoByDay,
  leaders,
  silent,
}: {
  whoByDay: Map<string, string[]>;
  /** The days in the running for Chosen Date, so they can be marked. */
  leaders: string[];
  silent: string[];
}) {
  const days = [...whoByDay.keys()].sort();
  if (days.length === 0 && silent.length === 0) return null;

  const leading = new Set(leaders);

  return (
    <section className={styles.who} aria-labelledby="who-is-free">
      <h2 id="who-is-free" className={styles.heading}>
        Who&rsquo;s free when
      </h2>

      {days.length === 0 ? null : (
        <dl className={styles.list}>
          {days.map((day) => {
            const names = whoByDay.get(day) ?? [];
            return (
              <div
                key={day}
                className={leading.has(day) ? `${styles.row} ${styles.lead}` : styles.row}
              >
                <dt className={styles.day}>
                  {shortDate(day)}
                  <span className={styles.count}>{names.length}</span>
                </dt>
                <dd className={styles.names}>{names.join(", ")}</dd>
              </div>
            );
          })}
        </dl>
      )}

      {silent.length > 0 ? (
        <p className={styles.silent}>
          <span className={styles.silentLabel}>Not answered yet</span>
          {silent.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
