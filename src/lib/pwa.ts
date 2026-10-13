// PWA helpers: service worker registration and install-state detection.

// The service worker only runs on the published site. In dev, inside the Lovable editor
// preview (an iframe on *.lovableproject.com / id-preview--*.lovable.app) it would serve
// stale builds, so there we remove any worker an earlier build may have left behind.
export function canUseServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  const host = window.location.hostname;
  if (
    host === "localhost" ||
    host.endsWith(".lovableproject.com") ||
    host.startsWith("id-preview--")
  )
    return false;
  return true;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    if (!canUseServiceWorker()) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      return null;
    }
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.warn("[pwa] service worker registration failed", e);
    return null;
  }
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
