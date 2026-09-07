"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
 * **Updated at the user's request**: Convert opens the shared `Modal` first —
 * same confirm-before-spending shape `SellItemsList` uses, minus the
 * destructive tint, since this trade is a purchase rather than a one-way loss.
 *
 * Success says nothing in the message slot (user-directed, 2026-09-06 — "keep
 * it clean"). It gets the *same* transient pop a completed task or subtask
 * does instead: `+40 XP` floating off the button on `task-reward-float`, the
 * keyframe TASK-05 already owns. Between that and the header's `XpCard` bar
 * refilling, a conversion now answers "did that work?" twice without leaving
 * anything behind on the card.
 *
 * The message slot is still used for the two things neither of those can say —
 * a failure, and how many coins short the account is. Convert is `disabled`
 * whenever it can't be afforded (and while one is in flight); the disabled
 * treatment is a real colour change rather than `opacity-50`, which on the
 * violet tint read as "greyed out but probably still tappable".
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
  const [celebration, setCelebration] = useState<number | null>(null);

  const canAfford = coins >= costCoins;
  const shortfall = costCoins - coins;

  // The pop clears itself after one run of `task-reward-float`, same 900ms
  // and same cleanup shape `SubtaskList` uses for its own reward pop.
  //
  // Nothing else belongs in this timer. `router.refresh()` was briefly moved
  // in here, on a hunch that a refresh re-rendering this card mid-pop would
  // cut the pop short — it does not (the button's DOM node survives a
  // refresh, so this component keeps its state), and calling `refresh()` from
  // a timeout instead of from the event handler broke it outright: scheduled
  // that way it does not commit until the next interaction, so the XP bar
  // caught up a click late and, worse, a stale `coins` prop left Convert
  // enabled on an account that could no longer afford it. Refresh belongs in
  // `handleConvert`, where the user's click is still the thing driving it.
  useEffect(() => {
    if (celebration === null) return;
    const timer = setTimeout(() => setCelebration(null), 900);
    return () => clearTimeout(timer);
  }, [celebration]);

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

      setCelebration(body?.gained ?? gainXp);
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
        ) : !canAfford ? (
          <p className="mt-1 text-[10px] leading-[1.3] text-ink-faint">
            Not enough coins — {shortfall.toLocaleString("en-US")} more needed
          </p>
        ) : null}
      </div>

      <span className="relative flex-none">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending || !canAfford}
          className={cn(
            "flex h-[34px] flex-none items-center justify-center rounded-[10px] bg-violet px-[15px]",
            "font-display text-[13px] font-semibold text-white transition-colors duration-120 ease-out",
            "hover:not-disabled:bg-violet/90",
            "disabled:cursor-not-allowed disabled:bg-violet/40 disabled:text-white/70",
          )}
        >
          {pending ? "Converting…" : "Convert"}
        </button>

        {celebration !== null ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 [animation:task-reward-float_900ms_ease-out_forwards] text-[11px] font-extrabold whitespace-nowrap text-violet-text"
          >
            +{celebration} XP
          </span>
        ) : null}
      </span>

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
