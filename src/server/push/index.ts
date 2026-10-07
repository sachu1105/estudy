import "server-only";

import webpush from "web-push";

import { env } from "@/server/env";

// Web push over VAPID. Without a key pair, push is simply off and email still works.

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let ready: boolean | null = null;

export function pushAvailable() {
  if (ready === null) {
    ready = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
    if (ready)
      webpush.setVapidDetails(
        env.VAPID_SUBJECT ?? "mailto:no-reply@studyplanner.local",
        env.VAPID_PUBLIC_KEY!,
        env.VAPID_PRIVATE_KEY!,
      );
  }
  return ready;
}

/**
 * Sends to one browser. `gone` means the browser dropped the subscription, so the row
 * should go: the same endpoint will never work again.
 */
export async function sendPush(
  target: PushTarget,
  message: PushMessage,
): Promise<{ ok: boolean; gone: boolean }> {
  if (!pushAvailable()) return { ok: false, gone: false };
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(message),
      { TTL: 6 * 3600 },
    );
    return { ok: true, gone: false };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return { ok: false, gone: status === 404 || status === 410 };
  }
}

export const publicVapidKey = () => env.VAPID_PUBLIC_KEY ?? null;
