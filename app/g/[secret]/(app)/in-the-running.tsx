import { shortDate } from "@/lib/cycle/announcement";

import styles from "./in-the-running.module.css";

/**
 * Every night tied for the lead, and who can make each.
 *
 * The number on the calendar says how many. This says who, for every night
 * Close Day is still choosing between — a four-way tie is four nights. It is a
 * list, not a row of buttons.
 */
export function InTheRunning({
  leaders,
  whoByDay,
  answered,
  memberCount,
}: {
  leaders: { day: string; count: number }[];
  whoByDay: Map<string, string[]>;
  /** Everyone who has tapped at least one evening, by name. */
  answered: string[];
  memberCount: number;
}) {
  if (leaders.length === 0) return null;

  return (
    <section className={styles.running} aria-labelledby="in-the-running">
      <h2 id="in-the-running" className={styles.heading}>
        In the running
      </h2>

      <ol className={styles.cards}>
        {leaders.map((tally) => {
          const can = whoByDay.get(tally.day) ?? [];
          const canSet = new Set(can);
          const cannot = answered.filter((name) => !canSet.has(name));
          return (
            <li key={tally.day} className={styles.card}>
              <span className={styles.date}>{shortDate(tally.day)}</span>
              <span className={styles.of}>
                {tally.count} of {memberCount}
              </span>
              <span className={styles.names}>
                {can.map((name) => (
                  <span key={name} className={styles.chip}>
                    {name}
                  </span>
                ))}
                {cannot.map((name) => (
                  <span key={name} className={`${styles.chip} ${styles.off}`}>
                    {name}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
