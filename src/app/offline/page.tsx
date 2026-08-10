import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "You're offline · TaskTails",
};

/**
 * PWA-03 — the service worker's fallback for a navigation that fails with no
 * network at all: `public/sw.js`'s fetch handler serves this from cache
 * instead of the browser's own "no internet" interstitial. Confirmed with
 * the user (2026-08-10) as a plain static fallback rather than a cached
 * "last-known screen" — caching real per-user page HTML was already ruled
 * out for PWA-02 (stale/wrong-participant-data risk), and that reasoning
 * applies here too.
 *
 * Deliberately **not** `SHR-07`'s `ConnectivityGate`/`OfflineState` reused
 * as-is, despite the obvious overlap. Those assume you were already using
 * the app and connectivity dropped mid-session — "we'll sync your progress"
 * only makes sense once there's a session and progress to promise. This can
 * be the very first thing a signed-out visitor with an empty cache ever
 * sees, so the copy stays generic rather than claiming a context that might
 * not exist. Also deliberately not wrapped in `AppShell`: that would pull in
 * `ConnectivityGate` too, which would re-decide whether to show this content
 * from `navigator.onLine` after hydration — redundant at best (we already
 * know this only renders because a real navigation just failed) and
 * confusing at worst if it ever raced a reconnect.
 *
 * **Inline styles, not Tailwind classes** — the one deliberate exception to
 * "tokens, not hex" in this codebase, and worth explaining: verified live
 * that this page can genuinely be served with *no other cache entry at all*
 * (the very first offline moment of a fresh install, before any page has
 * ever loaded to populate the reactive JS/CSS cache) — real Tailwind classes
 * depend on Next's external, content-hashed CSS chunk, which is not
 * guaranteed cached in that exact scenario, and confirmed by literally
 * hitting it: the page rendered with zero styling, dark background, blue
 * underlined link, the works. Inline styles have no such dependency — the
 * raw cached HTML alone is correct, needing neither that CSS chunk nor JS
 * hydration (this page has no interactivity to hydrate anyway). Values below
 * are `globals.css`'s own `--color-board`/`--color-ink`/`--color-ink-soft`/
 * `--color-terracotta`/`--color-terracotta-tint` and `--font-display`,
 * copied rather than referenced since a `var(--…)` still resolves through
 * the same missing external stylesheet. Font gracefully falls back to
 * `system-ui` if Fredoka's own `@font-face` (also in that stylesheet) isn't
 * registered yet — normal web-font degradation, not a bug.
 */
export default function OfflinePage() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F1E9DC",
        padding: "0 24px",
        textAlign: "center",
        fontFamily: '"Fredoka", system-ui, sans-serif',
        color: "#2E2A26",
      }}
    >
      <div
        aria-hidden
        style={{
          marginBottom: "16px",
          display: "flex",
          width: "64px",
          height: "64px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          backgroundColor: "#FBEAE3",
        }}
      >
        <WifiOff size={26} strokeWidth={2.2} color="#E27A54" />
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>Can&rsquo;t reach TaskTails</h1>
      <p
        style={{
          marginTop: "8px",
          maxWidth: "260px",
          fontSize: "13.5px",
          lineHeight: 1.5,
          color: "#524C47",
          fontFamily: '"Nunito", system-ui, sans-serif',
        }}
      >
        You&rsquo;re offline, and this page hasn&rsquo;t loaded on this device before.
      </p>
      {/* A plain `<a>`, not `next/link`'s `<Link>`, deliberately: once JS has
          hydrated, `Link` intercepts this click as a client-side transition
          (a different, non-"navigate" fetch), which would never reach
          `sw.js`'s fallback logic at all — this specifically needs a real,
          full navigation, so the network genuinely gets retried. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        style={{
          marginTop: "24px",
          display: "inline-flex",
          height: "48px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "13px",
          padding: "0 28px",
          backgroundColor: "#E27A54",
          color: "#FFFFFF",
          fontFamily: '"Fredoka", system-ui, sans-serif',
          fontSize: "16px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Try again
      </a>
    </div>
  );
}
