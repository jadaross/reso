/**
 * How a saved Rating is shown back.
 *
 * The card collapses to one line, and the Past list's "N people" is the number
 * of names under it. A Rating with no Note is still a name — just one with no
 * quote — so the count cannot drift from the list.
 */

export type RatedMember = {
  memberId: string;
  who: string;
  score: number;
  note: string | null;
};

export type ShownRating = {
  memberId: string;
  who: string;
  score: number;
  /** The Note, or null when they rated and left none. */
  quote: string | null;
};

/** "Tayyabs ★★★★ · your line", or without the note when they left none. */
export function collapsedRatingLine(
  place: string,
  score: number,
  note: string | null,
): { text: string; place: string; stars: string; quote: string | null } {
  const stars = "★".repeat(Math.max(0, Math.min(5, score)));
  const quote = note?.trim() ? note.trim() : null;
  const text = quote ? `${place} ${stars} · ${quote}` : `${place} ${stars}`;
  return { text, place, stars, quote };
}

/** The names under a Visit, and the "N people" that counts them. */
export function shownRatings(ratings: RatedMember[]): {
  peopleLabel: string;
  lines: ShownRating[];
} {
  const lines = ratings.map((row) => ({
    memberId: row.memberId,
    who: row.who,
    score: row.score,
    quote: row.note?.trim() ? row.note.trim() : null,
  }));
  const count = lines.length;
  return {
    peopleLabel: count === 1 ? "1 person" : `${count} people`,
    lines,
  };
}
