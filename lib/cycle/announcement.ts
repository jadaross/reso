import type { PriceTier } from "@/lib/db/schema";

import { memberOnDate } from "./booking";
import type { DayString } from "./dates";
import { formatPriceTier } from "./tier";

export type AnnouncementFacts = {
  month: string;
  /** A dinner party has no place to name and needs a host, not a booking. */
  kind?: "restaurant" | "party";
  chosenDate: DayString | null;
  place: string | null;
  area: string | null;
  tier: PriceTier;
  /** How many Members are going. */
  going: number;
  /** The Members bringing a guest, by name — only those who are themselves going. */
  guests: string[];
  tickets: number;
  /** Who added the drawn place. Booking it is their job. */
  pickedBy?: string | null;
  /** Who has booked the table, once someone has. */
  bookedBy?: string | null;
};

/**
 * The one place the month's result is put into words.
 *
 * Push and the WhatsApp share both read from here so they can never disagree, and
 * ticket 05 expects Jada to rewrite the wording once she has seen it in situ — so
 * it is all in one small module rather than scattered through the screens.
 */
export function announcementText(facts: AnnouncementFacts): string {
  const month = monthName(facts.month);

  if (!facts.chosenDate) {
    return `${month}: nobody put any dates in, so there's nothing booked.`;
  }
  if (facts.kind === "party") {
    return `${month}: dinner party — ${readableDate(facts.chosenDate)}. ${headcountLine(facts)}. Someone needs to host.`;
  }
  if (!facts.place) {
    return `${month}: ${readableDate(facts.chosenDate)} works for most of us, but there was nothing in the ${formatPriceTier(facts.tier)} list to draw from.`;
  }

  const head = `${month}: ${facts.place}${facts.area ? `, ${facts.area}` : ""} — ${readableDate(facts.chosenDate)}.`;
  return `${head} ${headcountLine(facts)}. ${bookingLine(facts)}`;
}

/** "7 of us, including Lottie's and Jada's guests" */
export function headcountLine(facts: Pick<AnnouncementFacts, "going" | "guests">): string {
  const heads = facts.going + facts.guests.length;
  if (facts.guests.length === 0) return `${heads} of us`;
  return `${heads} of us, including ${guestsPhrase(facts.guests)}`;
}

/** "Lottie's guest", "Lottie's and Jada's guests". */
export function guestsPhrase(hosts: string[]): string {
  const owners = hosts.map((name) => `${name}'s`);
  if (owners.length === 1) return `${owners[0]} guest`;
  const last = owners[owners.length - 1];
  return `${owners.slice(0, -1).join(", ")} and ${last} guests`;
}

/** "Booked by Jada.", "Lottie to book it.", or "Still needs booking." */
export function bookingLine(
  facts: Pick<AnnouncementFacts, "pickedBy" | "bookedBy">,
): string {
  if (facts.bookedBy) return `Booked by ${facts.bookedBy}.`;
  if (facts.pickedBy) return `${facts.pickedBy} to book it.`;
  return "Still needs booking.";
}

export function monthName(month: string): string {
  return new Date(`${month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
}

/** "Nov", the same short month the dates use. */
export function shortMonth(month: string): string {
  return new Date(`${month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * The header slot, identical on every tab: the current Outing's month, then its
 * Price Tier. A Dinner Party is a kind of Outing, not a tier, so it keeps its name.
 */
export function formatHeaderSlot(outing: {
  month: string;
  kind: "restaurant" | "party";
  tier: PriceTier;
}): string {
  const month = shortMonth(outing.month);
  if (outing.kind === "party") return `${month} · dinner party`;
  return `${month} · ${formatPriceTier(outing.tier)}`;
}

export function readableDate(day: DayString): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function shortDate(day: DayString): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Sat 14" — the month is already named on the same line. */
export function weekdayAndDay(day: DayString): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Sat 12 Dec leads · 3 of 6 · Jack, Lottie, Sienna" */
export function leadHeadline(
  day: DayString,
  count: number,
  memberCount: number,
  names: readonly string[],
): string {
  return `${shortDate(day)} leads · ${count} of ${memberCount} · ${names.join(", ")}`;
}

/** Where the viewer stands on a settled month's Chosen Date. */
export type GoingMark = "going" | "cant" | "unanswered" | "went";

/**
 * Going is being free on the Chosen Date. A Member who has answered the month
 * but not that night can't. A Visit keeps who went, which is that same answer
 * frozen, so a done month reads the record rather than today's taps.
 */
export function goingMarkFor(
  days: readonly string[],
  chosenDate: string | null,
  settled: "announced" | "done",
  went = false,
): GoingMark {
  if (settled === "done") return went ? "went" : "unanswered";
  if (!chosenDate) return "unanswered";
  return memberOnDate(days, chosenDate);
}

const GOING_WORD: Record<GoingMark, string | null> = {
  going: "Going ✓",
  cant: "Can’t",
  went: "Went ✓",
  unanswered: null,
};

/** "November · Sat 14 · Smoking Goat · Going ✓" */
export function settledFoldLine(input: {
  month: string;
  chosenDate: string | null;
  place: string | null;
  going: GoingMark;
}): string {
  const parts = [monthName(input.month)];
  if (input.chosenDate) parts.push(weekdayAndDay(input.chosenDate));
  if (input.place) parts.push(input.place);
  const mark = GOING_WORD[input.going];
  if (mark) parts.push(mark);
  return parts.join(" · ");
}

/** "January and beyond" — the months after the one that is open. */
export function beyondLabel(month: string): string {
  return `${monthName(month)} and beyond`;
}
