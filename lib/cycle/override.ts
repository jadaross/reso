import type { OutingKind, PriceTier } from "@/lib/db/schema";

import type { DayString } from "./dates";
import type { Decision } from "./month-choice";
import { formatPriceTier } from "./tier";

/**
 * Whether a Chosen Date is the one the availability tally produced, or one an
 * Admin pinned over it.
 */
export type DatePin = {
  chosenDate: DayString | null;
  overridden: boolean;
};

/**
 * Tapping a night pins it. Tapping the pinned night again clears the pin and
 * the Chosen Date becomes whatever the tally says now.
 */
export function tapNight(
  current: DatePin,
  night: DayString,
  recomputed: DayString | null,
): DatePin {
  if (current.overridden && current.chosenDate === night) {
    return clearDatePin(recomputed);
  }
  return { chosenDate: night, overridden: true };
}

/** "Let the vote decide": drop the pin and take the recomputed night. */
export function clearDatePin(recomputed: DayString | null): DatePin {
  return { chosenDate: recomputed, overridden: false };
}

/**
 * Close Day keeps a pin. With no pin, the Chosen Date is the recomputed leader.
 */
export function resolveChosenDate(
  recomputed: DayString | null,
  pin: DatePin,
): DayString | null {
  if (pin.overridden && pin.chosenDate) return pin.chosenDate;
  return recomputed;
}

export type TierSource = "rota" | "vote";

/**
 * The rota is what the block is overriding when nobody voted, or when the rota
 * broke a tie it was part of. Anything else the Month Vote settled is "the vote".
 */
export function tierSource(how: Decision["how"]): TierSource {
  return how === "rota" || how === "tie-rota" ? "rota" : "vote";
}

/**
 * A tied Month Vote is drawn once, when the Outing opens. Looking at it again
 * for an undo must not roll a different tier on every page load, so the Admin
 * screen takes the first of the tied choices rather than drawing.
 */
export function stablePick<T>(candidates: readonly T[]): T | null {
  return candidates[0] ?? null;
}

/** What the heading names: the stored month, unless an Admin has overridden it. */
export function tierBaseline(
  how: Decision["how"],
  stored: { kind: OutingKind; tier: PriceTier },
  decision: { kind: OutingKind; tier: PriceTier },
  overridden: boolean,
): { source: TierSource; kind: OutingKind; tier: PriceTier } {
  const source = tierSource(how);
  if (!overridden) return { source, ...stored };
  return { source, kind: decision.kind, tier: decision.tier };
}

export function tierMark(kind: OutingKind, tier: PriceTier): string {
  return kind === "party" ? "Dinner party" : formatPriceTier(tier);
}

export function tierHeading(source: TierSource, mark: string): string {
  return `${source === "rota" ? "Rota says" : "Vote said"} ${mark} · Override`;
}

export function tierUndo(source: TierSource): string {
  return source === "rota" ? "Back to the rota" : "Back to the vote";
}

export function tierSetNote(month: string, mark: string): string {
  return `${month} is now ${mark}`;
}

export function tierClearedNote(month: string, source: TierSource): string {
  return `${month} is back to the ${source === "rota" ? "rota" : "vote"}`;
}

export function pinNote(month: string, night: string): string {
  return `${month} pinned to ${night}`;
}

export function voteAgainNote(month: string, night: string | null): string {
  return night ? `${month} follows the vote, ${night}` : `${month} follows the vote`;
}

export function pinLine(admin: string, night: string): string {
  return `${admin} pinned ${night}`;
}

export function drawAgainLabel(place: string): string {
  return `Draw again (the table is booked for ${place}; you'll need to cancel it)`;
}
