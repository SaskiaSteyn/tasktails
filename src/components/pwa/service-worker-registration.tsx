"use client";

import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * PWA-02 registers `public/sw.js`; PWA-08 is everything here that reacts once
 * a new one shows up. Mounted once in the root layout so both run on every
 * page, signed in or out — the marketing site's own install button (PWA-07)
 * needs a worker registered before there is a session to gate on, and a
 * stale cached build is just as wrong for a signed-out visitor as a signed-in
 * one, so this doesn't gate the update banner on a session either, despite
 * the ticket's own "prompt the signed-in user" wording.
 *
 * A browser tracks at most one "waiting" worker per registration — the one
 * installed but not yet controlling any page, because at least one open tab
 * is still running the previous version. That can happen two ways, both
 * handled the same way: it's already sitting there when this tab loads
 * (another tab triggered the update first), or it appears while this tab is
 * open (`updatefound` → the new worker's `statechange` reaching
 * `"installed"`). Either way, once found, `waitingWorker` drives the banner.
 *
 * Deliberately no polling (`registration.update()`): the browser already
 * checks for a new worker on every navigation and periodically in the
 * background, and that's enough for "detect it on deploy" — anything tighter
 * is effort this ticket doesn't ask for.
 *
 * Clicking "Refresh" posts `SKIP_WAITING` to the waiting worker (the other
 * half of this handshake is `public/sw.js`'s own `message` listener), which
 * makes it activate immediately instead of waiting for every tab to close.
 * The reload itself waits for `controllerchange` rather than firing
 * immediately after `postMessage` — activation is asynchronous, and reloading
 * before it completes would just reload onto the *old* worker again.
 */
export function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Only ever fires once a new worker has actually taken control — never
    // on the very first, uncontrolled load — so this can't loop.
    function handleControllerChange() {
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A worker already installed and waiting when this tab attached.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // `navigator.serviceWorker.controller` is what tells an *update*
            // (something to prompt about) apart from this tab's very first,
            // uncontrolled install (nothing to prompt about — there is no
            // previous version running yet).
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!waitingWorker || dismissed) return null;

  return (
    <div
      role="status"
      style={{ "--focus-ring": "#fff" } as React.CSSProperties}
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-ink px-4 py-[10px] pt-[calc(10px+env(safe-area-inset-top))] text-[13px] font-bold text-white [&_:focus-visible]:shadow-[0_0_0_5px_rgb(46_42_38/0.45)]"
    >
      <RefreshCw size={14} strokeWidth={2.4} aria-hidden />
      <span>A new version of TaskTails is available.</span>
      <button
        type="button"
        onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
        className="underline underline-offset-2 hover:no-underline"
      >
        Refresh
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="opacity-70 hover:opacity-100"
      >
        <X size={16} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
