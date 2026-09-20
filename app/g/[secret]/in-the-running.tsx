import { shortDate } from "@/lib/cycle/announcement";

import styles from "./in-the-running.module.css";

/**
 * The evenings in the running for Chosen Date, and who can make each.
 *
 * The bars on the calendar say how many; this says who, for the three nights
 * that actually matter — the ones Close Day will choose between. It answers "is
 * the night that's winning one my lot can do?" and nothing else. Everyone else's
 * availability lives on the Free tab.
 */
export function InTheRunning({
  leaders,
  whoByDay,
  answered,
  silent,
  memberCount,
}: {
  leaders: { day: string; count: number }[];
  whoByDay: Map<string, string[]>;
  /** Everyone who has tapped at least one evening, by name. */
  answered: string[];
  silent: string[];
  memberCount: number;
}) {
  if (leaders.length === 0) return null;

  // Only worth explaining the dashes once there is a dash to explain.
  const anyCannot = leaders.some(
    (tally) => (whoByDay.get(tally.day)?.length ?? 0) < answered.length,
  );

  return (
    <section className={styles.running} aria-labelledby="in-the-running">
      <h2 id="in-the-running" className={styles.heading}>
        In the running
      </h2>

      <ol className={styles.cards}>
        {leaders.map((tally, index) => {
          const can = new Set(whoByDay.get(tally.day) ?? []);
          const cannot = answered.filter((name) => !can.has(name));
          return (
            <li
              key={tally.day}
              className={index === 0 ? `${styles.card} ${styles.top}` : styles.card}
            >
              <span className={styles.date}>{shortDate(tally.day)}</span>
              <span className={styles.of}>
                {tally.count} of {memberCount}
              </span>
              <span className={styles.names}>
                {[...can].map((name) => (
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

      {silent.length > 0 || anyCannot ? (
        <p className={styles.rest}>
          {silent.length > 0
            ? `${silent.join(", ")} ${silent.length === 1 ? "hasn't" : "haven't"} answered yet. `
            : ""}
          {anyCannot ? "Dashed names can\u2019t do that night." : ""}
        </p>
      ) : null}
    </section>
  );
}
