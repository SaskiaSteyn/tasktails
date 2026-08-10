// PWA-02 — the service worker. Cache-first, but only for the static app
// shell: Next's fingerprinted JS/CSS chunks under /_next/static/ (safe to
// cache-first because the filename changes whenever the content does), the
// hand-known static files (brand icons, animal art, the manifest), and web
// fonts. Nothing else.
//
// Deliberately does not touch pages or /api/ responses. TaskTails is a
// signed-in, per-user app — a cache-first HTML page or API response here
// would risk one participant seeing another's cached data, or their own gone
// stale, which is a correctness bug this ticket has no business creating.
// PWA-03 (offline app shell) and PWA-04 (offline task data) are what decide
// whether and how navigations/API calls get handled at all — not decided
// here.
//
// PWA-08's "SKIP_WAITING" message is the other half of a two-sided handshake
// with `service-worker-registration.tsx`: without it, a worker that has
// finished installing still sits "waiting" — activating only once every tab
// running the previous version has closed — which for a tab nobody closes is
// never. The message is what lets the client-side "Refresh" button actually
// mean refresh, rather than a button that does nothing until the page is
// closed and reopened regardless.

const CACHE_VERSION = "v1";
const CACHE_NAME = `tasktails-shell-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/manifest.webmanifest", "/brand/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("tasktails-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/brand/")) return true;
  if (url.pathname.startsWith("/animals/")) return true;
  if (url.pathname === "/manifest.webmanifest") return true;
  return /\.(?:woff2?|ttf|otf)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (!isStaticAsset(url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      // Fingerprinted assets are immutable once built, but a 4xx/5xx (e.g. a
      // stale chunk after a deploy) must never get cached as if it were one.
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    }),
  );
});
