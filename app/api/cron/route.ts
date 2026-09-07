import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  closeDueOutings,
  ensureOpenOuting,
  markPastOutingsDone,
} from "@/lib/cycle/close";
import { todayInLondon } from "@/lib/cycle/dates";

/**
 * The daily job.
 *
 * Vercel Hobby allows one cron run a day, fires it within an hour of the stated
 * time, does not retry, and may double-fire. So every step here is idempotent and
 * driven by "what is true today" rather than "what day is it exactly" — an Outing
 * is closed because its Close Day has passed and it is still open, never because
 * the job happens to be running on the 15th.
 *
 * Sending the reminder and announcement messages belongs here too, but the message
 * calendar and wording are still an open decision (wayfinder ticket 05), so this
 * job currently only advances the cycle.
 */
export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const today = todayInLondon();

  const openedMonth = await ensureOpenOuting(today);
  const closed = await closeDueOutings(today);
  const completed = await markPastOutingsDone(today);

  return NextResponse.json({ today, openedMonth, closed, completed });
}

function isAuthorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const offered = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(offered);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
