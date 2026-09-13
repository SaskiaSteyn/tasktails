"use client";

import { useEffect } from "react";

const SESSION_STORAGE_KEY = "tt_session_id";

/**
 * ADM-10 — logs one `SESSION_START` per browser tab and one `SESSION_END`
 * when the tab actually goes away. Mounted (renders nothing) on every
 * authenticated page, but a client-side route change between them doesn't
 * start a new session — `sessionStorage` is tab-scoped and survives an
 * in-app navigation, so only the *first* authenticated page a tab loads
 * finds no id and logs the start; every later page in the same tab sees the
 * existing id and does nothing.
 *
 * `pagehide` rather than `beforeunload`: fires reliably on mobile Safari
 * (where `beforeunload` is unreliable) and survives the page being torn
 * down mid-navigation, which a plain `fetch` in an unload handler does not
 * — `sendBeacon` is built for exactly this.
 *
 * **`pagehide` alone is not enough, and shipping with only it is the bug
 * behind every real deployed account showing `sessionCount > 0` and
 * `totalTimeInAppMs: 0` despite genuine repeat use.** On Android/iOS, going
 * to the home screen or switching apps backgrounds the tab; the OS is then
 * free to reclaim that tab's process under memory pressure with **no
 * unload-family event of any kind** — the page's JavaScript simply stops
 * existing. A start with no matching end contributes zero on purpose (see
 * `sessionMetricsForUser`'s "an undercount is honest" comment), so a
 * participant who never once closes the tab from the foreground (the normal
 * way anyone uses a phone app) racks up sessions and never logs a single
 * millisecond. `visibilitychange` → `"hidden"` is the fix: it fires the
 * instant the tab is backgrounded, which is strictly before any later
 * process reclaim, so it is the one signal mobile actually guarantees — it's
 * why analytics vendors treat it as the primary "flush now" signal and
 * `pagehide`/`unload` as a desktop-only supplement, not the other way round.
 * Sent on every hide, not just a final one: `sessionMetricsForUser` pairs by
 * `sessionId` with last-write-wins, so each hide simply advances the
 * recorded end time further out — if the tab is later reopened and
 * backgrounded again, or the true final `pagehide` never arrives, the most
 * recent hide already stands in for it instead of leaving the session
 * unpaired.
 */
export function SessionTracker() {
  useEffect(() => {
    const existingSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const sessionId = existingSessionId ?? crypto.randomUUID();

    if (!existingSessionId) {
      fetch("/api/telemetry/session-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      })
        .then((res) => {
          // Only remember this id once the server has actually logged it.
          // Writing it unconditionally (the original bug here) meant a
          // dropped request — a network blip, a server restart mid-flight —
          // silently poisoned every later page load in this tab into
          // believing a session already started, with no retry, for the
          // rest of the tab's life. Confirmed live: a real account showed a
          // `STORE_TIME_ON_PAGE` event (that tracker has no such gate) but
          // no `SESSION_START` ever, from a tab that outlived a container
          // restart.
          if (res.ok) sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        })
        .catch(() => {});
    }

    const sendSessionEnd = () => {
      navigator.sendBeacon(
        "/api/telemetry/session-end",
        new Blob([JSON.stringify({ sessionId })], { type: "application/json" }),
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendSessionEnd();
    };

    window.addEventListener("pagehide", sendSessionEnd);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", sendSessionEnd);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
