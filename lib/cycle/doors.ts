import type { PriceTier } from "@/lib/db/schema";

import { monthName, shortDate } from "./announcement";
import { formatPriceTier } from "./tier";

/** One Pick that was in a Draw, named with the Member who holds it. */
export type DrawnTicket = { name: string; holder: string };

/**
 * The open month, as the strip under the ticket.
 *
 * "December · £££ month · tap your free nights by Sun 22 Nov"
 */
export function openMonthLine(input: {
  month: string;
  tier: PriceTier;
  kind: "restaurant" | "party";
  closeDay: string;
}): string {
  const what =
    input.kind === "party" ? "dinner party" : `${formatPriceTier(input.tier)} month`;
  return `${monthName(input.month)} · ${what} · tap your free nights by ${shortDate(input.closeDay)}`;
}

/** "0 tapped", "3 tapped". The chip does not change the word. */
export function tappedChip(tapped: number): string {
  return `${tapped} tapped`;
}

/**
 * The Month Vote, folded: "January · 2 votes · counted 1 Dec".
 * The count day is the 1st, so the weekday is left off.
 */
export function voteDoorLine(month: string, votes: number, countedOn: string): string {
  const noun = votes === 1 ? "vote" : "votes";
  return `${monthName(month)} · ${votes} ${noun} · counted ${dayAndMonth(countedOn)}`;
}

/** What a tie does. One line, shown while the vote is open. */
export function tieRule(): string {
  return "The rota breaks a tie it is in; any other tie is drawn.";
}

/** "Drawn from 5 tickets", with a redraw marked when the last draw was one. */
export function drawnFromLine(count: number, rerolled: boolean): string {
  const noun = count === 1 ? "ticket" : "tickets";
  const redraw = rerolled ? ", after a redraw" : "";
  return `Drawn from ${count} ${noun}${redraw}`;
}

function dayAndMonth(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
