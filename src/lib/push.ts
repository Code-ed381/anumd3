import webpush from "web-push";
import { db, throwIfError } from "@/lib/db";
import type { PushSubscriptionRow } from "@/lib/types";

function vapidConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configureVapid() {
  if (!vapidConfigured()) {
    throw new Error("VAPID keys are not set");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPush(ownerId: string, payload: PushPayload) {
  if (!vapidConfigured()) {
    console.warn("Push skipped: VAPID env vars are not set");
    return { skipped: true as const };
  }

  configureVapid();
  const subscriptions = throwIfError(
    await db()
      .from("push_subscriptions")
      .select("*")
      .eq("owner_id", ownerId),
  ) as PushSubscriptionRow[];

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (error) {
        const status =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          staleIds.push(sub.id);
        } else {
          console.error("Push send failed", error);
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await db().from("push_subscriptions").delete().in("id", staleIds);
  }

  return { sent: subscriptions.length - staleIds.length };
}
