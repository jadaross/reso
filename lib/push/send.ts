import { eq, inArray } from "drizzle-orm";
import webpush, { type PushSubscription } from "web-push";

import { getDb } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

export type PushPayload = {
  title: string;
  body: string;
  /** Path to open when tapped, e.g. `/g/<secret>`. */
  url: string;
  /** Notifications sharing a tag replace one another instead of stacking. */
  tag?: string;
};

let configured = false;

function configure(): boolean {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Send one payload to many Devices.
 *
 * Standard VAPID Web Push — no Apple developer account is involved, even for
 * installed iOS apps. Subscriptions that come back 404 or 410 are deleted: Apple
 * documents 410 for an expired token, and a Member who deletes the Home Screen
 * icon is only ever visible to us as one of those two.
 */
export async function sendToSubscriptions(
  subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!configure() || subscriptions.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };

      try {
        await webpush.sendNotification(subscription, body);
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(row.id);
      }
    }),
  );

  if (dead.length > 0) {
    await getDb()
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, dead));
  }

  return { sent, removed: dead.length };
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await getDb()
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}
