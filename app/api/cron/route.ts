import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  closeDueOutings,
  ensureOpenOuting,
  markPastOutingsDone,
} from "@/lib/cycle/close";
import { todayInLondon } from "@/lib/cycle/dates";
import { sendDueMessages } from "@/lib/cycle/messages";

/**
 * The daily job.
 *
 * Vercel Hobby allows one cron run a day, fires it within an hour of the stated
 * time, does not retry, and may double-fire. So every step here is idempotent and
 * driven by "what is true today" rather than "what day is it exactly" — an Outing
 * is closed because its Close Day has passed and it is still open, never because
 * the job happens to be running on the 15th.
 *
 * Messages go out after the cycle has advanced, so an Outing that closes on this
 * run is announced on the same run rather than a day later. Each kind is claimed in
 * `sent_messages` before it is sent, so a double-firing cron cannot double-send.
 */
export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const today = todayInLondon();

  const openedMonth = await ensureOpenOuting(today);
  const closed = await closeDueOutings(today);
  const completed = await markPastOutingsDone(today);

  // Never let a failed push stop the cycle: the state above is already committed,
  // and a Member who missed a notification still sees the right thing on opening.
  let messages: Awaited<ReturnType<typeof sendDueMessages>> = [];
  try {
    messages = await sendDueMessages(today);
  } catch (error) {
    console.error("[cron] messages failed", error);
  }

  return NextResponse.json({ today, openedMonth, closed, completed, messages });
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
