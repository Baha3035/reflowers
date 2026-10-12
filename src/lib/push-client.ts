// Browser side of web push: permission, subscribe/unsubscribe, status for the UI.
import { canUseServiceWorker, isIos, isStandalone } from "./pwa";
import { deletePushSubscription, savePushSubscription } from "./push.functions";

export type PushStatus =
  | "unsupported" // browser has no Push API
  | "preview" // dev / Lovable preview: the service worker is disabled there
  | "ios-install" // iPhone/iPad: push only works after "Add to Home Screen"
  | "not-configured" // VAPID keys not set on the server yet
  | "denied"
  | "off"
  | "on";

function base64UrlToUint8Array(b64url: string) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON();
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      userAgent: navigator.userAgent,
    },
  });
}

export async function getPushStatus(publicKey: string | null): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isStandalone()) return "ios-install";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (!canUseServiceWorker()) return "preview";
  if (!publicKey) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  return (await currentSubscription()) ? "on" : "off";
}

export async function enablePush(publicKey: string): Promise<boolean> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const options = { userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(publicKey) };
  let sub = await reg.pushManager.getSubscription();
  try {
    sub ??= await reg.pushManager.subscribe(options);
  } catch {
    // An old subscription made with different keys blocks a new one: replace it.
    await (await reg.pushManager.getSubscription())?.unsubscribe();
    sub = await reg.pushManager.subscribe(options);
  }
  await save(sub);
  return true;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe();
}

// Re-links this device to whoever is signed in now (e.g. after switching accounts).
// Runs at most once per user per page load.
let syncedFor: string | null = null;
export async function syncPushSubscription(userId: string) {
  if (syncedFor === userId) return;
  syncedFor = userId;
  if (typeof window === "undefined" || !canUseServiceWorker()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const sub = await currentSubscription();
  if (sub) await save(sub).catch(() => {});
}

// Called before sign-out so the next person on this device doesn't get our pushes.
export async function forgetPushSubscription() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const sub = await currentSubscription().catch(() => null);
  if (sub) await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => {});
}
