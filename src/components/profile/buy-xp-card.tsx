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
 * **Reshaped onto the shared card recipe (#271).** #280 moved this off
 * Profile into the store's Sell tab, where it sits beside `SellItemsCard` in
 * the same two-column grid — but it kept its old Profile shape (a wide
 * borderless violet-tint band with the button on the right), so the two
 * cards in that row agreed on nothing. It is now the same portrait recipe
 * `SellItemsCard`/`LuckyBoxCard` use: `border-border-track`/`bg-warm` shell,
 * 44px tinted well, name, sub-line, full-width action at `mt-auto`.
 *
 * The violet survives as the well tint, the icon and the button fill rather
 * than as the whole card's background — same way sage and amber tell that
 * other pair apart. The button stays *filled* where `SellItemsCard`'s is
 * outlined: it is the only control here with a real disabled state (you can
 * be short of coins), and the disabled treatment is a colour change rather
 * than `opacity-50`, which on an outline would have had nothing much to
 * change.
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
 * a failure, and how many coins short the account is. It sits between the
 * sub-line and the button; `mt-auto` on the button keeps it pinned to the
 * card's foot either way, so a card carrying a message is no taller than its
 * row-mate. Convert is `disabled` whenever it can't be afforded (and while
 * one is in flight).
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
    <div className="flex h-full flex-col rounded-card border border-border-track bg-warm p-[11px]">
      <div className="flex size-[44px] flex-none items-center justify-center rounded-[11px] bg-violet-tint">
        <Sparkles size={22} strokeWidth={2} className="text-violet-text" aria-hidden />
      </div>

      <p className="mt-[9px] text-[13px] font-extrabold">Buy XP with coins</p>
      <p className="mt-[3px] mb-[11px] text-[11px] font-bold text-ink-soft">
        {costCoins} coins &rarr; {gainXp} XP
      </p>

      {error ? (
        <p role="alert" className="mb-[9px] text-[10px] leading-[1.3] text-urgency-text">
          {error}
        </p>
      ) : !canAfford ? (
        <p className="mb-[9px] text-[10px] leading-[1.3] text-ink-faint">
          Not enough coins — {shortfall.toLocaleString("en-US")} more needed
        </p>
      ) : null}

      {/* `mt-auto`: the two cards in this row stretch to a shared height, and
          their buttons line up with each other rather than each floating
          under its own copy — same as `SellItemsCard`/`LuckyBoxCard`. The
          wrapper is `relative` for the reward pop below. */}
      <span className="relative mt-auto block">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending || !canAfford}
          className={cn(
            "flex h-[32px] w-full items-center justify-center rounded-[10px] bg-violet",
            "font-display text-[12.5px] font-semibold text-white transition-colors duration-120 ease-out",
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
