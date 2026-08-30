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
// PWA-03 adds exactly one exception to "does not touch pages": a navigation
// whose network fetch fails outright (no connection at all) gets
// `/offline` instead of the browser's own interstitial — network-first,
// never cache-first, so a page's real content is still always fresh the
// moment the network actually is there. Confirmed with the user (2026-08-10)
// as a plain static fallback, not a cached "last-known screen" — caching
// real per-user page HTML is the same correctness problem as above, and
// PWA-04 (offline task data) was confirmed out of scope for the same reason.
//
// PWA-08's "SKIP_WAITING" message is the other half of a two-sided handshake
// with `service-worker-registration.tsx`: without it, a worker that has
// finished installing still sits "waiting" — activating only once every tab
// running the previous version has closed — which for a tab nobody closes is
// never. The message is what lets the client-side "Refresh" button actually
// mean refresh, rather than a button that does nothing until the page is
// closed and reopened regardless.

// Bumped whenever a cache-first asset changes *without* its URL changing.
// `/brand/` and `/animals/` are cache-first (see `isStaticAsset`) and
// `/brand/icon.svg` is precached outright, so an installed PWA keeps serving
// the previous app icon and fox art forever otherwise — the SW file itself is
// what the browser diffs to decide a new worker is worth installing.
// v3 — 2026-08-30, the new app icon and fox artwork.
const CACHE_VERSION = "v3";
const CACHE_NAME = `tasktails-shell-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/manifest.webmanifest", "/brand/icon.svg", "/offline"];

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

  // A top-level page navigation (typing a URL, a hard reload, opening the
  // installed app) — not a client-side route transition inside an already
  // loaded session, which Next serves as its own RSC fetch, a different
  // request `mode`. Network-first: try the real thing, and only on an
  // outright failure (no connection) fall back to the cached offline page.
  // A 4xx/5xx still reaches the browser normally — that's a real answer
  // from the server, not "no network", and swallowing it into the offline
  // page would hide an actual bug behind a misleading message.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/offline").then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

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
