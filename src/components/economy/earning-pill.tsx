"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CooldownCountdown } from "@/components/economy/cooldown-countdown";
import { cn } from "@/lib/cn";
import type { EarningStatus } from "@/lib/economy";

/**
 * #224 — the header's earning-status pill, beside the streak pill / level
 * disc. Two states, same compact `rounded-pill` shape as `StreakPill`:
 *
 *  - **open** — amber `EARNING · 2 / 3`, the window progress. Hidden at 0 / 3
 *    so a fresh window adds no chrome.
 *  - **on cooldown** — violet `PAUSED · 17:42`, a live `M:SS` countdown off
 *    `earningStatusOf()`'s `cooldownUntil`. On `0:00` it `router.refresh()`es
 *    and falls back to the open state.
 *
 * Presentational — the status is resolved server-side (`earningStatusOf`,
 * expired cooldowns already read as open) and passed down.
 */
const PILL =
  "inline-flex flex-none items-center gap-1 rounded-pill px-[9px] py-1 text-[11px] font-extrabold";

export function EarningPill({ earning }: { earning: EarningStatus }) {
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  const onCooldown = earning.cooldownUntil !== null && !expired;

  if (onCooldown) {
    return (
      <span
        className={cn(PILL, "border border-violet/25 bg-violet-tint text-violet-text")}
      >
        Paused
        <CooldownCountdown
          until={earning.cooldownUntil as string}
          onExpire={() => {
            setExpired(true);
            router.refresh();
          }}
          className="font-display text-[12px] font-semibold tabular-nums"
        />
      </span>
    );
  }

  if (earning.windowUsed <= 0) return null;

  return (
    <span
      role="img"
      aria-label={`${earning.windowUsed} of ${earning.windowSize} tasks earned before a cooldown`}
      className={cn(PILL, "border border-amber-ring bg-amber-tint text-amber-text")}
    >
      Earning
      <span className="font-display text-[12px] font-semibold">
        {earning.windowUsed}/{earning.windowSize}
      </span>
    </span>
  );
}
