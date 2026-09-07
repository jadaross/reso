import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { currentMember } from "@/lib/identity/guard";
import { removeSubscription } from "@/lib/push/send";

type Body = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

/** Store this Device's push subscription against the Member who claimed it. */
export async function POST(request: Request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Pick your name first" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json({ error: "Malformed subscription" }, { status: 400 });
  }

  // Keyed by endpoint: re-subscribing on the same Device must not create a second
  // row, and a Device that changes hands should follow whoever claimed it last.
  await getDb()
    .insert(pushSubscriptions)
    .values({ memberId: member.id, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { memberId: member.id, p256dh, auth },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Pick your name first" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (typeof body?.endpoint !== "string") {
    return NextResponse.json({ error: "Malformed subscription" }, { status: 400 });
  }

  await removeSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
