"use client";

import { useEffect, useRef } from "react";

/**
 * ADM-10's "time-on-page for store pages" bullet. Mounted only on `/store`.
 *
 * Mirrors `SessionTracker`'s `pagehide` + `sendBeacon` shape, but also sends
 * on the effect's own cleanup: unlike a tab close, navigating from `/store`
 * to another in-app route is a client-side transition with no `pagehide`
 * event, so the unmount is the only signal that time on this page just
 * ended. `sentRef` guards against sending twice when both fire (a real tab
 * close unmounts the component too, just not necessarily before `pagehide`).
 */
export function StoreTimeTracker() {
  const startedAtRef = useRef(0);
  const sentRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = performance.now();
    sentRef.current = false;

    const send = () => {
      if (sentRef.current) return;
      sentRef.current = true;

      const durationMs = Math.round(performance.now() - startedAtRef.current);
      navigator.sendBeacon(
        "/api/telemetry/store-time",
        new Blob([JSON.stringify({ durationMs })], { type: "application/json" }),
      );
    };

    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      send();
    };
  }, []);

  return null;
}
