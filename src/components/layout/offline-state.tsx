import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * SHR-07 — the full-screen "error / offline" state (`design_handoff`,
 * Module 7 — "State · error / offline"). Purely presentational; the
 * connectivity check that decides when to show it lives in
 * `ConnectivityGate`, which also supplies `onRetry`.
 *
 * The mock draws the icon as a hand-built CSS shape inside a circular tint;
 * this uses `lucide-react`'s `WifiOff` instead, same "real icon, not a
 * drawn shape" call `StoreItemCard`'s lock glyph already made. Circular
 * (`rounded-full`), not the `rounded-card-lg` tile SHR-04/05/06 use — the
 * mock draws this one specific icon well as a circle, unlike the others.
 */
export function OfflineState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden
        className="mb-4 flex size-16 items-center justify-center rounded-full bg-terracotta-tint"
      >
        <WifiOff size={26} strokeWidth={2.2} className="text-terracotta" />
      </div>
      <p className="font-display text-[17px] font-semibold">
        Can&rsquo;t reach TaskTails
      </p>
      <p className="mt-[6px] mb-[18px] text-[12.5px] text-ink-soft">
        You&rsquo;re offline. We&rsquo;ll sync your progress once you&rsquo;re
        back.
      </p>
      <Button
        variant="primary"
        size="inline"
        fullWidth={false}
        className="px-[22px]"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}
