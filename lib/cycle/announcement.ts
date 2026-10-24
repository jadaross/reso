import type { PriceTier } from "@/lib/db/schema";

import type { DayString } from "./dates";

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
    return `${month}: ${readableDate(facts.chosenDate)} works for most of us, but there was nothing in the ${facts.tier} list to draw from.`;
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
