"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLevelUp } from "@/components/economy/level-up-provider";
import { Modal } from "@/components/ui/modal";
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
 *
 * **Updated at the user's request**: Convert now opens the shared `Modal`
 * first — same confirm-before-spending shape `SellItemsList` uses, minus the
 * destructive tint, since this trade is a purchase rather than a one-way
 * loss. A conversion that doesn't cross a level boundary used to be entirely
 * silent (the coin/XP figures elsewhere on the page just quietly changed on
 * `router.refresh()`), so success now says so in the card's existing message
 * slot, as a `role="status"` line — polite, not an alert: good news.
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
  const [confirming, setConfirming] = useState(false);
  const [converted, setConverted] = useState(false);

  const canAfford = coins >= costCoins;

  async function handleConvert() {
    if (pending) return;
    setPending(true);
    setError(null);
    setConverted(false);

    try {
      const response = await fetch("/api/economy/buy-xp", { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        setError(body?.error ?? "Couldn't convert right now. Try again.");
        return;
      }

      setConverted(true);
      celebrate(body.levelUp);
      router.refresh();
    } catch {
      setError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPending(false);
      setConfirming(false);
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
        ) : converted ? (
          <p role="status" className="mt-1 text-[10px] leading-[1.3] font-bold text-violet-text">
            Converted — {gainXp} XP added
          </p>
        ) : !canAfford ? (
          <p className="mt-1 text-[10px] leading-[1.3] text-ink-faint">
            Not enough coins yet
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending || !canAfford}
        className={cn(
          "flex h-[34px] flex-none items-center justify-center rounded-[10px] bg-violet px-[15px]",
          "font-display text-[13px] font-semibold text-white transition-colors duration-120 ease-out",
          "hover:not-disabled:bg-violet/90 disabled:opacity-50",
        )}
      >
        {pending ? "Converting…" : "Convert"}
      </button>

      <Modal
        open={confirming}
        icon={Sparkles}
        iconTint="violet"
        title="Convert coins to XP?"
        body={`This spends ${costCoins.toLocaleString("en-US")} coins and adds ${gainXp.toLocaleString("en-US")} XP.`}
        confirmLabel={pending ? "Converting…" : "Convert"}
        cancelLabel="Cancel"
        onConfirm={handleConvert}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
