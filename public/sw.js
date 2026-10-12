// ReFlowers service worker.
// Pages are rendered on the server, so HTML is never cached: navigations always go to the
// network and fall back to /offline.html. Hashed build assets and bouquet photos are cached.

const VERSION = "v1";
const STATIC_CACHE = `rf-static-${VERSION}`;
const IMAGE_CACHE = `rf-images-${VERSION}`;
const MAX_IMAGES = 150;
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, IMAGE_CACHE]);
      for (const key of await caches.keys()) {
        if (key.startsWith("rf-") && !keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

function isSupabaseImage(url) {
  return url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/");
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok || res.type === "opaque") {
        cache.put(request, res.clone()).then(() => trimCache(IMAGE_CACHE, MAX_IMAGES));
      }
      return res;
    })
    .catch(() => hit || Response.error());
  return hit || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  if (request.destination === "image" && isSupabaseImage(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
