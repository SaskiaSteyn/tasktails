"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useSyncExternalStore } from "react";

import { OfflineState } from "@/components/layout/offline-state";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * SHR-07 — the client-side connectivity check that decides when to show
 * `OfflineState`, per the user (2026-08-05): a reusable gate on the
 * browser's own `online`/`offline` events, taking over the screen the
 * moment connectivity drops, rather than a `Next.js` `error.tsx` render
 * boundary (a different failure mode — an uncaught render/data-fetch
 * error, not literal connectivity).
 *
 * Built on `useSyncExternalStore` rather than a `useState` + `useEffect`
 * pair — the textbook shape for subscribing a component to a mutable
 * browser API (`navigator.onLine`, `online`/`offline` events) without
 * either a hydration mismatch (`getServerSnapshot` returns `true` — assume
 * online during SSR, since `navigator` doesn't exist there) or an
 * eslint `react-hooks/set-state-in-effect` violation, which a plain
 * `useState(navigator.onLine)` synced from inside an effect body hits.
 *
 * `handleRetry` does two things rather than one: re-reads `navigator.onLine`
 * immediately (`online`/`offline` events don't retroactively fire for a
 * state the browser was already in when the tab regained focus, e.g. after
 * being backgrounded through a connectivity change) and calls
 * `router.refresh()` unconditionally, so a "Retry" click also re-runs the
 * server components on the current route rather than only clearing the
 * overlay — the mock's own "we'll sync your progress" promise needs a real
 * data re-fetch, not just visibility toggling.
 *
 * Wraps `AppShell`'s `children` only — not `header`/`nav` — so SHR-01's
 * chrome stays visible while offline, the same "replace the content, keep
 * the chrome" pattern `CartPanel`'s and `StoreBrowser`'s own states use.
 */
export function ConnectivityGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return <>{children}</>;
  // `router.refresh()` re-runs the server components on the current route —
  // the "sync your progress" this state promises needs a real data
  // re-fetch, not just a chance for `useSyncExternalStore` to re-read
  // `navigator.onLine` (which a plain re-render already does for free).
  return <OfflineState onRetry={() => router.refresh()} />;
}
