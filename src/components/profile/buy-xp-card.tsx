"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLevelUp } from "@/components/economy/level-up-provider";
import { cn } from "@/lib/cn";

/**
 * PRO-06 — the violet "Buy XP with coins" card, wired to ECO-06's existing
 * `POST /api/economy/buy-xp` for real (that route already documents this card
 * as its intended caller).
 *
 * `costCoins`/`gainXp` are passed in from the server (`BUY_XP_COST_COINS`/
 * `BUY_XP_GAIN_XP` in `src/lib/rewards.ts`) rather than fetched client-side —
 * the Profile page is already a server component reading the account and
 * economy the same way, so there's no reason to round-trip for a fixed price.
 * ECO-06's `GET` stays for whatever non-server-rendered consumer needs it.
 *
 * No border, unlike the mock's `#E1D8F0` — `study-overview-card.tsx`'s violet
 * callout already established a borderless `bg-violet-tint` treatment for
 * this app, and that hex has no token to reach for instead.
 *
 * A level-up crossing goes straight to ECO-07's `useLevelUp().celebrate()`,
 * same as every other XP-granting action (TASK-05, SUB-05).
 */
export function BuyXpCard({
  costCoins,
  gainXp,
  coins,
}: {
  costCoins: number;
  gainXp: number;
  coins: number;
}) {
  const router = useRouter();
  const { celebrate } = useLevelUp();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAfford = coins >= costCoins;

  async function handleConvert() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/economy/buy-xp", { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        setError(body?.error ?? "Couldn't convert right now. Try again.");
        return;
      }

      celebrate(body.levelUp);
      router.refresh();
    } catch {
      setError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-violet-tint px-[14px] py-[13px]">
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold text-violet-text">
          Buy XP with coins
        </p>
        <p className="text-[11px] font-bold text-violet">
          {costCoins} coins → {gainXp} XP
        </p>
        {error ? (
          <p role="alert" className="mt-1 text-[10px] leading-[1.3] text-urgency-text">
            {error}
          </p>
        ) : !canAfford ? (
          <p className="mt-1 text-[10px] leading-[1.3] text-ink-faint">
            Not enough coins yet
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleConvert}
        disabled={pending || !canAfford}
        className={cn(
          "flex h-[34px] flex-none items-center justify-center rounded-[10px] bg-violet px-[15px]",
          "font-display text-[13px] font-semibold text-white transition-colors duration-120 ease-out",
          "hover:not-disabled:bg-violet/90 disabled:opacity-50",
        )}
      >
        {pending ? "Converting…" : "Convert"}
      </button>
    </div>
  );
}
