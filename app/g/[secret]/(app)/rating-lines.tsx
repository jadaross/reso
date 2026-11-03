import type { ShownRating } from "@/lib/cycle/rating";

import rows from "./past/history.module.css";

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

