"use client";

import { Gift, Info, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  useAchievementUnlock,
  type AchievementUnlockLike,
} from "@/components/economy/achievement-unlock-provider";
import { useLevelUp, type LevelUpEventLike } from "@/components/economy/level-up-provider";
import { CATEGORY_LABEL, ItemWell } from "@/components/store/item-visual";
import { LuckyBoxOpening } from "@/components/store/lucky-box-opening";
import { Button, buttonClasses } from "@/components/ui/button";
import { Coin, RollingCoins } from "@/components/ui/coin";
import { cn } from "@/lib/cn";

/**
 * GACHA-12 — the Lucky Box home screen's content, per the approved design
 * board (`Beta/Planning/TaskTails Screens - Gacha.html` §2, "Lucky Box ·
 * home", "· opening moment" and "· reveal"). `src/app/store/lucky-box/page.tsx`
 * supplies the header (back chevron, title, info-icon button).
 *
 * No odds or pity anywhere on this screen, per the ticket's own wording —
 * the inline "Tap [info icon] above for the full odds" line points at the
 * page's own info button rather than repeating any figure here, and there
 * is nothing pity-related to show even if the design wanted to (`gacha.ts`'s
 * `HARD_PITY_THRESHOLD`/`pullsSinceLegendary` never reach this far).
 *
 * **The Open button is real, not inert** — a course-correction on
 * `GACHA-10`'s own "render but wire up later" call: `GACHA-04`'s pull
 * endpoint has been done, tested and live-verified since before this
 * ticket started, so there was something to link the moment this screen
 * existed, and leaving the one interactive element on the page dead made
 * the ticket untestable.
 *
 * `GACHA-13`/`GACHA-14` are now fully wired here, not just the earlier
 * minimal version: a `pulling` state swaps the whole screen to
 * `LuckyBoxOpening`'s own radiating-burst visual (the design board's
 * dedicated "opening moment" frame, not an inline pulse on this screen's
 * own box icon), and this component owns the "~1.5s beat before reveal"
 * timing the design board calls for — `LuckyBoxOpening` is presentational
 * only. The reveal well now renders through `ItemWell` itself
 * (`bgClassNameOverride`/`iconClassNameOverride`, added for this) instead
 * of a hand-rolled `Image`/`DynamicIcon` switch, so animal art and goods
 * icons follow the exact same code path every other well in the app uses,
 * just tinted by rarity instead of category.
 */

type PulledItemShape = {
  id: string;
  name: string;
  category: "FOOD" | "ACCESSORIES" | "DECORATIONS" | "ANIMALS";
  imageUrl: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | null;
  locked: boolean;
};

type PullResponse =
  | {
      item: PulledItemShape;
      economy: { coins: number };
      /** #259 — the pull evaluates achievements now, same as a checkout does. */
      achievementsUnlocked?: AchievementUnlockLike[];
      levelUp?: LevelUpEventLike | null;
    }
  | { error: string };

const RARITY_STYLE: Record<string, { tint: string; text: string }> = {
  COMMON: { tint: "bg-input", text: "text-ink-soft" },
  RARE: { tint: "bg-sage-tint", text: "text-sage-text" },
  EPIC: { tint: "bg-violet-tint", text: "text-violet-text" },
  LEGENDARY: { tint: "bg-amber-tint", text: "text-amber-text" },
};

/** GACHA-13 — "~1.5s beat before reveal" per the design board; enforced here since `LuckyBoxOpening` is purely the visual. */
const OPENING_MIN_DURATION_MS = 1500;

export function LuckyBoxHome({
  price,
  coins: initialCoins,
}: {
  price: number;
  coins: number;
}) {
  const { celebrate: celebrateAchievements } = useAchievementUnlock();
  const { celebrate: celebrateLevelUp } = useLevelUp();

  const router = useRouter();
  const [coins, setCoins] = useState(initialCoins);
  // #267 — what the balance line rolls down *from*. A pull unmounts this whole
  // screen for `LuckyBoxOpening`, so the balance always comes back on a fresh
  // mount and has no previous render of its own to animate away from.
  const [spentFrom, setSpentFrom] = useState(initialCoins);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PulledItemShape | null>(null);

  async function pull() {
    setPulling(true);
    setError(null);
    const startedAt = Date.now();
    try {
      const res = await fetch("/api/gacha/pull", { method: "POST" });
      const body: PullResponse = await res.json();
      const remaining = OPENING_MIN_DURATION_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      if (!res.ok || "error" in body) {
        setError("error" in body ? body.error : "Something went wrong.");
        return;
      }
      setSpentFrom(coins);
      setCoins(body.economy.coins);
      setResult(body.item);
      // Over the reveal, not instead of it: the celebration is a dialog and
      // the pulled item stays on the screen behind it, exactly as a checkout
      // confirmation does (`CartPanel`). #259 — a pull is how the ownership
      // badges are earned, so this is where they have to be announced.
      celebrateAchievements(body.achievementsUnlocked);
      // A pull grants no XP itself, but an achievement it unlocks can.
      celebrateLevelUp(body.levelUp);
      // The desktop header's coin pill is server-rendered — without this it
      // keeps the pre-pull balance until the next navigation.
      router.refresh();
    } catch {
      setError("Couldn't reach TaskTails. Try again.");
    } finally {
      setPulling(false);
    }
  }

  if (pulling) {
    return <LuckyBoxOpening />;
  }

  if (result) {
    const style = RARITY_STYLE[result.rarity ?? "COMMON"];
    return (
      <div className="flex flex-1 flex-col items-center px-[30px] pt-2 pb-1.5 text-center">
        <div className="flex-1" />

        <p className={cn("mb-3 text-[10.5px] font-extrabold tracking-[1px]", style.text)}>
          {result.rarity ?? "COMMON"}
        </p>

        <ItemWell
          item={{ category: result.category, imageUrl: result.imageUrl }}
          size={112}
          iconSize={44}
          animalIconSize={56}
          rounded="rounded-[24px]"
          bgClassNameOverride={style.tint}
          iconClassNameOverride={style.text}
          className="mb-[18px]"
        />

        <p className="font-display text-[21px] font-semibold">{result.name}</p>
        <p className="mt-[3px] text-[12px] text-ink-faint">{CATEGORY_LABEL[result.category]}</p>

        {result.locked ? (
          <div className="mt-[10px] flex items-center gap-[5px] rounded-[8px] bg-amber-tint px-3 py-[6px] text-[11px] font-extrabold text-amber-text">
            <Lock size={13} strokeWidth={2.4} aria-hidden />
            Added, locked — unlocks soon
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-ink-soft">Added to your collection</p>
        )}

        <div className="min-h-5 flex-1" />

        {error && (
          <p role="alert" className="mb-2 text-[11.5px] font-bold text-urgency-text">
            {error}
          </p>
        )}

        {/* Each `Button`/`Link` is stretched by its own wrapper rather than
            `fullWidth={false}` + a `flex-1` override: `fullWidth={false}`
            emits `flex-none`, and `cn` is a plain join with no conflict
            resolution, so the two would race on stylesheet order instead of
            one clearly winning — the same reasoning `edit-task-form.tsx`
            documents for its own Save-changes button. Found live, 2026-08-08:
            without this, both buttons collapsed to content width instead of
            splitting the row per the design board. */}
        <div className="flex w-full gap-2">
          <div className="flex-1">
            <Button variant="secondary" size="dialog" onClick={pull} disabled={coins < price}>
              Pull again
            </Button>
          </div>
          <div className="flex-1">
            <Link
              href="/store"
              className={buttonClasses({ variant: "primary", size: "dialog" })}
            >
              Done
            </Link>
          </div>
        </div>
        <p className="mt-[10px] text-[11px] text-ink-faint">
          Balance: <RollingCoins value={coins} from={spentFrom} /> coins
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-[26px] pt-2 pb-1.5 text-center">
      <div className="flex-1" />

      <div className="relative mb-[18px] flex size-[128px] items-center justify-center rounded-[26px] bg-amber-tint">
        <div className="pointer-events-none absolute -inset-[10px] rounded-[32px] border border-amber-ring" />
        <Gift size={58} strokeWidth={1.6} className="text-amber-text" aria-hidden />
      </div>

      <p className="font-display text-[19px] font-semibold">1 Lucky Box</p>
      <p className="mt-1.5 text-[12.5px] leading-[1.5] text-ink-soft">
        Every box is Common, Rare, Epic or Legendary. Tap{" "}
        <Info size={11} strokeWidth={2.4} className="inline-block align-[-1px] text-ink-soft" aria-hidden />{" "}
        above for the full odds.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-[11.5px] font-bold text-urgency-text">
          {error}
        </p>
      )}

      <div className="min-h-4 flex-1" />

      <button
        type="button"
        onClick={pull}
        disabled={coins < price}
        className="flex h-[50px] w-full items-center justify-center gap-2 rounded-btn bg-terracotta font-display text-[16px] font-semibold text-white shadow-btn transition-opacity duration-120 disabled:opacity-60"
      >
        Open · <Coin size={14} />
        {price.toLocaleString("en-US")}
      </button>
      <p className="mt-[10px] text-[11px] text-ink-faint">
        Balance: <RollingCoins value={coins} from={spentFrom} /> coins
      </p>
    </div>
  );
}
