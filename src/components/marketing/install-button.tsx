"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { Button, buttonClasses } from "@/components/ui/button";

/**
 * PWA-07 — the marketing hero's third CTA, next to "Start for free" and
 * "Watch demo". No design mock exists for this (PWA-07 postdates
 * `design_handoff`), so it borrows MKT-01's own hero-button treatment
 * (`secondary`/`hero`) rather than inventing a new visual language.
 *
 * Renders nothing until it's known — already installed, `beforeinstallprompt`
 * fired, or running on iOS — so there is one render pass with no flash of a
 * button that then disappears.
 *
 * `installed` and `isIos` are read via `useSyncExternalStore`, the same call
 * `ConnectivityGate` (SHR-07) made for the same reason: a plain
 * `useState`+`useEffect` pair that assigns on mount hits the `eslint
 * react-hooks/set-state-in-effect` rule (setState called synchronously in an
 * effect body, not from a subscription callback) and — for `installed` in
 * particular — a `useState(navigator...)` initializer would also mismatch
 * against the server render, since `navigator` doesn't exist there.
 * `getServerSnapshot` answers "not installed, not iOS" for both, which is
 * what hides the button until the client determines otherwise.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt`; clicking replays that
 * captured event to trigger the native install dialog. iOS Safari never
 * fires it — there is no programmatic install API — so iOS gets a small
 * instructions dialog instead ("Share" then "Add to Home Screen"), the
 * only path that actually exists there.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosDevice() {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports a desktop Safari UA by default; multi-touch is what
  // still gives it away.
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIpadOs;
}
// Static for the life of the tab — no event ever changes it, so the store
// never notifies.
function subscribeNever() {
  return () => {};
}
function getIsIosSnapshot() {
  return isIosDevice();
}
function getIsIosServerSnapshot() {
  return false;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Older iOS Safari's own flag, never added to the DOM lib types.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function subscribeStandalone(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}
function getInstalledServerSnapshot() {
  return false;
}

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosDialog, setShowIosDialog] = useState(false);
  const isIos = useSyncExternalStore(subscribeNever, getIsIosSnapshot, getIsIosServerSnapshot);
  const installed = useSyncExternalStore(
    subscribeStandalone,
    isStandalone,
    getInstalledServerSnapshot,
  );

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Nothing actionable: already installed, or neither a captured native
  // prompt nor iOS (desktop Firefox/Safari, which support neither path).
  if (installed || (!deferredPrompt && !isIos)) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowIosDialog(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={buttonClasses({
          variant: "secondary",
          size: "hero",
          fullWidth: false,
          className: "gap-[9px] px-5 text-[16px] sm:px-[26px] sm:text-[17px]",
        })}
      >
        <Download size={15} strokeWidth={2.4} aria-hidden />
        Install app
      </button>

      <IosInstallDialog open={showIosDialog} onClose={() => setShowIosDialog(false)} />
    </>
  );
}

/**
 * A single-action info dialog, not `Modal` — `Modal` is built for the
 * addendum's confirm/cancel dialog (§2/§3), always two stacked actions with
 * opposite intents. This has one intent ("okay, got it"), and forcing a
 * second button that would do the exact same thing would just be noise.
 * Still built on the native `<dialog>` with the same tokens, so it looks and
 * behaves like the rest of the app's overlays (focus trap, Escape, scrim tap
 * all come from the platform).
 */
function IosInstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="m-auto w-[calc(100%-2.5rem)] max-w-[300px] bg-transparent p-0 text-ink backdrop:bg-scrim"
    >
      <div className="rounded-modal bg-surface px-[22px] pt-6 pb-5 shadow-modal">
        <div className="mx-auto mb-[14px] flex size-14 items-center justify-center rounded-full bg-terracotta-tint text-terracotta">
          <Share size={26} strokeWidth={2.2} aria-hidden />
        </div>

        <h2 id={titleId} className="text-center font-display text-[20px] font-semibold">
          Install TaskTails
        </h2>

        <p id={bodyId} className="mt-2 text-center text-[13px] leading-[1.5] text-ink-soft">
          Tap the Share icon in Safari&rsquo;s toolbar, then &ldquo;Add to Home
          Screen.&rdquo;
        </p>

        <div className="mt-5">
          <Button size="dialog" variant="primary" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </dialog>
  );
}
