/*
 * PROTOTYPE FIXTURES — throwaway. Wayfinder ticket 06.
 *
 * No database is provisioned yet, and a design prototype should not depend on
 * one anyway. Everything here is invented data shaped like the real schema in
 * lib/db/schema.ts so the variants can be judged at real density.
 */

export type Tier = "low" | "medium" | "high";

export type Member = {
  id: string;
  name: string;
  isAdmin: boolean;
  /** Days of October 2026 this Member has tapped. */
  free: number[];
  plusOne: boolean;
};

export type Pick = {
  id: string;
  name: string;
  area: string;
  tier: Tier;
  addedBy: string;
  /** Whether a pasted map link resolved. Drives the "no address" state. */
  address: string | null;
};

/** The Outing under prototype: October 2026, a Low month, the first of the rotation. */
export const MONTH = { year: 2026, month: 9 } as const; // month is 0-indexed
export const MONTH_LABEL = "October 2026";
export const TIER: Tier = "low";
export const CHOSEN_DAY = 16; // Friday 16 October 2026
export const CLOSE_DAY_LABEL = "15 September";

export const members: Member[] = [
  { id: "m1", name: "Jada", isAdmin: true, free: [2, 9, 16, 17, 23, 30], plusOne: false },
  { id: "m2", name: "Priya", isAdmin: false, free: [9, 16, 17, 24], plusOne: true },
  { id: "m3", name: "Marcus", isAdmin: false, free: [16, 23, 30], plusOne: false },
  { id: "m4", name: "Nell", isAdmin: false, free: [1, 8, 15, 16, 22], plusOne: false },
  { id: "m5", name: "Tom", isAdmin: false, free: [16, 17, 30], plusOne: true },
  { id: "m6", name: "Ade", isAdmin: false, free: [9, 16, 17], plusOne: false },
  { id: "m7", name: "Fran", isAdmin: false, free: [], plusOne: false },
  { id: "m8", name: "Louis", isAdmin: false, free: [17, 23, 24], plusOne: false },
];

export const picks: Pick[] = [
  { id: "p1", name: "Tayyabs", area: "Whitechapel", tier: "low", addedBy: "Marcus", address: "83 Fieldgate St, E1" },
  { id: "p2", name: "Mangal 2", area: "Dalston", tier: "low", addedBy: "Jada", address: "4 Stoke Newington Rd, N16" },
  { id: "p3", name: "Mangal 2", area: "Dalston", tier: "low", addedBy: "Nell", address: "4 Stoke Newington Rd, N16" },
  { id: "p4", name: "Roti King", area: "Euston", tier: "low", addedBy: "Priya", address: "40 Doric Way, NW1" },
  { id: "p5", name: "Xi'an Impression", area: "Highbury", tier: "low", addedBy: "Ade", address: null },
  { id: "p6", name: "Silk Road", area: "Camberwell", tier: "low", addedBy: "Tom", address: "49 Camberwell Church St, SE5" },
  { id: "p7", name: "Kiln", area: "Soho", tier: "medium", addedBy: "Jada", address: "58 Brewer St, W1F" },
  { id: "p8", name: "Rochelle Canteen", area: "Shoreditch", tier: "medium", addedBy: "Louis", address: "16 Playground Gardens, E2" },
  { id: "p9", name: "Brat", area: "Shoreditch", tier: "medium", addedBy: "Priya", address: "4 Redchurch St, E1" },
  { id: "p10", name: "Chishuru", area: "Fitzrovia", tier: "high", addedBy: "Nell", address: "3 Great Titchfield St, W1W" },
  { id: "p11", name: "Lyle's", area: "Shoreditch", tier: "high", addedBy: "Marcus", address: "56 Shoreditch High St, E1" },
];

/** The Pick the Draw landed on. Mangal 2 — added twice, so it had two tickets. */
export const DRAWN = picks[1];

export const TIER_LABEL: Record<Tier, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Who is coming: everyone free on the Chosen Date, plus their Plus-ones. */
export const attending = members.filter((m) => m.free.includes(CHOSEN_DAY));
export const plusOnesCount = attending.filter((m) => m.plusOne).length;
export const headcount = attending.length + plusOnesCount;

/** How many Members are free on each day of the month. */
export function freeCountByDay(): Map<number, number> {
  const counts = new Map<number, number>();
  for (const m of members) {
    for (const day of m.free) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/** The month laid out as calendar rows, Monday first, with leading blanks. */
export function monthGrid(): (number | null)[] {
  const first = new Date(Date.UTC(MONTH.year, MONTH.month, 1));
  const daysInMonth = new Date(Date.UTC(MONTH.year, MONTH.month + 1, 0)).getUTCDate();
  // getUTCDay is Sunday-first; shift so Monday is 0.
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (number | null)[] = Array<null>(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function weekdayOf(day: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(Date.UTC(MONTH.year, MONTH.month, day)).getUTCDay()
  ];
}

export function isWeekend(day: number): boolean {
  const wd = new Date(Date.UTC(MONTH.year, MONTH.month, day)).getUTCDay();
  return wd === 0 || wd === 5 || wd === 6;
}

/** The message the Admin forwards to WhatsApp. Wording is ticket 05, not this one. */
export const ANNOUNCEMENT = `October's dinner: ${DRAWN.name}, ${DRAWN.area} — Friday 16 October. ${headcount} of us going. It's a Low month.`;

export const SCREENS = ["name", "dates", "announced", "picks"] as const;
export type Screen = (typeof SCREENS)[number];

export const SCREEN_LABEL: Record<Screen, string> = {
  name: "Who are you",
  dates: "Tapping dates",
  announced: "The reveal",
  picks: "Restaurants",
};

export const VARIANTS = ["A", "B", "C"] as const;
export type Variant = (typeof VARIANTS)[number];

export const VARIANT_NAME: Record<Variant, string> = {
  A: "Stub",
  B: "Planner",
  C: "Menu",
};
