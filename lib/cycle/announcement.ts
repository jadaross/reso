import type { PriceTier } from "@/lib/db/schema";

import type { DayString } from "./dates";

export type AnnouncementFacts = {
  month: string;
  chosenDate: DayString | null;
  place: string | null;
  area: string | null;
  tier: PriceTier;
  going: number;
  plusOnes: number;
  tickets: number;
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
  if (!facts.place) {
    return `${month}: ${readableDate(facts.chosenDate)} works for most of us, but there was nothing in the ${facts.tier} list to draw from.`;
  }

  const head = `${month}: ${facts.place}${facts.area ? `, ${facts.area}` : ""} — ${readableDate(facts.chosenDate)}.`;
  const heads = facts.going + facts.plusOnes;
  const who =
    facts.plusOnes > 0
      ? `${heads} of us, including ${facts.plusOnes} ${facts.plusOnes === 1 ? "guest" : "guests"}.`
      : `${heads} of us.`;

  return `${head} ${who} Still needs booking.`;
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
