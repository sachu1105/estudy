import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "../notify-actions";

// Turning web push on and off in this browser. The service worker does the receiving;
// here we only ask permission and hand the subscription to the server (milestone 16).

type Result = { ok: true } | { ok: false; error: string };

const urlBase64ToUint8Array = (base64: string) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const keyOf = (subscription: PushSubscription, name: "p256dh" | "auth") => {
  const key = subscription.getKey(name);
  return key
    ? btoa(String.fromCharCode(...new Uint8Array(key)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    : "";
};

export async function enablePush(vapidKey: string | null): Promise<Result> {
  if (!vapidKey)
    return { ok: false, error: "Push isn't set up on this server." };
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return { ok: false, error: "This browser can't show notifications." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return {
      ok: false,
      error:
        "Your browser is blocking notifications. Allow them for this site, then try again.",
    };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }));
    return await savePushSubscriptionAction({
      endpoint: subscription.endpoint,
      p256dh: keyOf(subscription, "p256dh"),
      auth: keyOf(subscription, "auth"),
    });
  } catch {
    return { ok: false, error: "Couldn't turn on notifications. Try again." };
  }
}

export async function disablePush(): Promise<Result> {
  if (!("serviceWorker" in navigator)) return { ok: true };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true };
    const { endpoint } = subscription;
    await subscription.unsubscribe();
    return await removePushSubscriptionAction({ endpoint });
  } catch {
    return { ok: false, error: "Couldn't turn notifications off. Try again." };
  }
}
