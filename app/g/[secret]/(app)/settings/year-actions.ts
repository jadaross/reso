"use server";

import { revalidatePath } from "next/cache";

import { saveYear, type SaveYearResult, type YearChange } from "@/lib/cycle/advance";
import { todayInLondon } from "@/lib/cycle/dates";
import { currentMember } from "@/lib/identity/guard";

/**
 * Save whole months of Availability at once, for the year screen.
 *
 * Each month arrives as its complete set of days. Anything malformed is dropped on
 * the way through rather than rejected, because the only thing the server needs
 * to hold the line on is which months can be answered and whose answer it is.
 */
export async function saveYearAction(
  secret: string,
  changes: YearChange[],
): Promise<SaveYearResult> {
  const member = await currentMember();
  if (!member) return { ok: false, error: "Tap your name first." };

  if (!Array.isArray(changes) || changes.length === 0) return { ok: true };
  if (changes.length > 24) {
    return { ok: false, error: "That is more months than a year has." };
  }

  const clean: YearChange[] = [];
  for (const change of changes) {
    if (
      typeof change?.month !== "string" ||
      !/^\d{4}-\d{2}-01$/.test(change.month) ||
      !Array.isArray(change.days)
    ) {
      return { ok: false, error: "That did not look like a month." };
    }
    clean.push({
      month: change.month,
      days: change.days.filter(
        (day): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day),
      ),
    });
  }

  const result = await saveYear(member.id, clean, todayInLondon());

  if (result.ok) {
    revalidatePath(`/g/${secret}`);
    revalidatePath(`/g/${secret}/settings`);
  }
  return result;
}
