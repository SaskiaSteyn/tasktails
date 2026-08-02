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

    const handlePageHide = () => {
      navigator.sendBeacon(
        "/api/telemetry/session-end",
        new Blob([JSON.stringify({ sessionId })], { type: "application/json" }),
      );
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  return null;
}
