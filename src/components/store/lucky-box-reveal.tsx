"use client";

import { Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  type AchievementUnlockLike,
  useAchievementUnlock,
} from "@/components/economy/achievement-unlock-provider";
import {
  type LevelUpEventLike,
  useLevelUp,
} from "@/components/economy/level-up-provider";
import { CATEGORY_LABEL, ItemWell } from "@/components/store/item-visual";
import { LuckyBoxOpening } from "@/components/store/lucky-box-opening";
import { RarityChip } from "@/components/store/rarity-chip";
import { SHINY_WASH, ShinyPill } from "@/components/store/shiny";
import { buttonClasses } from "@/components/ui/button";
import { CoinPill } from "@/components/ui/coin";
import type {
  StoreItemCategory,
  StoreItemRarity,
} from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { rarityTokens } from "@/lib/rarity";

type RevealedItem = {
  id: string;
  name: string;
  category: StoreItemCategory;
  imageUrl: string;
  rarity: StoreItemRarity | null;
  levelRequired: number;
  locked: boolean;
  shiny: boolean;
};

type OpenResponse = {
  items: RevealedItem[];
  achievementsUnlocked?: AchievementUnlockLike[];
  levelUp?: LevelUpEventLike | null;
  error?: string;
};

/** GACHA-13 — "~1.5s beat before reveal"; the opening visual is timing-free. */
const OPENING_MIN_DURATION_MS = 1500;
/** README §5 — "Flip all" turns the rest one after another. */
const FLIP_ALL_STAGGER_MS = 150;

const COUNT_WORDS: Record<number, string> = {
  3: "three",
  5: "five",
  7: "seven",
};

/**
 * The fan's rotations. Five cards use the handoff's −20…+20° ladder and fewer
 * use its middle (3 → −10/0/+10, 1 → 0°). ponytail: seven cards (the Trove,
 * which the handoff never draws) squeeze the same ±20° spread, so each covered
 * card keeps a ~35px strip rather than 52px; revisit if that reads too tight.
 */
function fanAngle(index: number, count: number): number {
  const step = count <= 5 ? 10 : 40 / (count - 1);
  return (index - (count - 1) / 2) * step;
}

/**
 * Opening → reveal (`design_handoff_lucky_boxes` 1e, 1f, 1g + UPDATE-02).
 *
 * Mount requests the open, holds the opening beat for at least 1.5s, then
 * deals the items face-down in a fan. Tapping a card flips it in place and
 * presents it large over a blurred scrim; ✕, a tap on the scrim or Esc drops
 * it back, face-up. There is no summary screen — the face-up fan is the
 * record of the haul — and one button, `Done`, live once every card is
 * turned.
 *
 * Achievements and level-ups the open earned are announced once every card
 * is turned and none is presented, not when the open lands, so a badge can't
 * give away a card that is still face-down or cover the last one revealed.
 */
export function LuckyBoxReveal({
  boxId,
  name,
  itemCount,
  resuming,
  coins,
}: {
  boxId: string;
  name: string;
  itemCount: number;
  /** Continuing an unfinished reveal — the box is already open, so no opening beat. */
  resuming: boolean;
  coins: number;
}) {
  const router = useRouter();
  const { celebrate: celebrateAchievements } = useAchievementUnlock();
  const { celebrate: celebrateLevelUp } = useLevelUp();

  const [result, setResult] = useState<OpenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>(() =>
    Array(itemCount).fill(false),
  );
  const [presented, setPresented] = useState<number | null>(null);

  // Strict Mode runs effects twice in development; the open is idempotent on
  // the server, but one request is still the right number.
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    const startedAt = Date.now();
    (async () => {
      try {
        const response = await fetch(`/api/gacha/boxes/${boxId}/open`, {
          method: "POST",
        });
        const body: OpenResponse = await response.json();
        const remaining = resuming
          ? 0
          : OPENING_MIN_DURATION_MS - (Date.now() - startedAt);
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        if (!response.ok) setError(body.error ?? "Something went wrong.");
        else setResult(body);
      } catch {
        setError("Couldn't reach TaskTails. Try again.");
      }
    })();
  }, [boxId, resuming]);

  const flippedCount = flipped.filter(Boolean).length;
  const allFlipped = flippedCount === itemCount;

  // Every card turned: the reveal is finished, so My boxes stops offering to
  // continue it. Anything short of this leaves the box resumable.
  // Held so Done can wait for it: otherwise My boxes can render before the
  // stamp lands and still offer Continue. `keepalive` so leaving the page any
  // other way doesn't cancel it.
  const markedRevealed = useRef<Promise<unknown> | null>(null);
  useEffect(() => {
    if (!allFlipped || !result || markedRevealed.current) return;
    markedRevealed.current = fetch(`/api/gacha/boxes/${boxId}/revealed`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Best effort — a miss only means the box offers Continue again.
    });
  }, [allFlipped, result, boxId]);

  const celebrated = useRef(false);
  useEffect(() => {
    // Not over the last card while it is still presented — that is the
    // moment itself. Once it is dropped back into the fan.
    if (!allFlipped || presented !== null || !result || celebrated.current)
      return;
    celebrated.current = true;
    celebrateAchievements(result.achievementsUnlocked);
    celebrateLevelUp(result.levelUp);
  }, [allFlipped, presented, result, celebrateAchievements, celebrateLevelUp]);

  function flip(index: number) {
    setFlipped((current) => current.map((value, i) => value || i === index));
  }

  function tap(index: number) {
    flip(index);
    setPresented(index);
  }

  function flipAll() {
    flipped.forEach((isFlipped, index) => {
      if (isFlipped) return;
      const order = flipped.slice(0, index).filter((value) => !value).length;
      setTimeout(() => flip(index), order * FLIP_ALL_STAGGER_MS);
    });
  }

  const items = result?.items;
  // Cards keep their deal order in the stack — the handoff lifted a tapped
  // card to the front, but then the cards it covered could not be tapped
  // (user's direction, 2026-09-13). So the last card is always the front one.
  const frontIndex = itemCount - 1;

  return (
    <div className="flex flex-1 flex-col">
      {/* The phone header. From `desk:` up the layout's own header titles the
          page, as it does for the cart. */}
      <header className="flex flex-none items-center gap-[10px] border-b border-border-track bg-warm px-[18px] pt-[calc(6px+env(safe-area-inset-top))] pb-[14px] desk:hidden">
        <h1 className="min-w-0 flex-1 truncate font-display text-[19px] leading-[1.15] font-semibold">
          {name}
        </h1>
        {items ? (
          <span className="flex-none rounded-pill border border-border-track bg-surface px-3 py-[5px] text-[12px] font-extrabold text-ink-soft">
            {flippedCount} of {itemCount} flipped
          </span>
        ) : (
          <CoinPill coins={coins} />
        )}
      </header>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p role="alert" className="text-[13px] font-bold text-ink-soft">
            {error}
          </p>
          <Link
            href="/store/boxes"
            className={buttonClasses({
              variant: "secondary",
              size: "inline",
              fullWidth: false,
            })}
          >
            Back to My boxes
          </Link>
        </div>
      ) : !items ? (
        <LuckyBoxOpening itemCount={itemCount} />
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-[18px]">
            <h2 className="font-display text-[17px] font-semibold desk:text-[22px]">
              {allFlipped
                ? itemCount === 1
                  ? "Card turned"
                  : `All ${COUNT_WORDS[itemCount] ?? itemCount} turned`
                : "Tap a card"}
            </h2>
            <p className="mt-[5px] text-center text-[11.5px] font-bold text-ink-faint desk:text-[12.5px]">
              {allFlipped
                ? `tap ${itemCount === 1 ? "it" : "any card"} to see it again`
                : "Everything is already yours — this is just the reveal"}
            </p>

            <div className="relative mt-[26px] h-[300px] w-[330px] flex-none desk:h-[290px] desk:w-[380px]">
              {items.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => tap(index)}
                  aria-label={
                    flipped[index]
                      ? `${item.name}, card ${index + 1} of ${itemCount}`
                      : `Card ${index + 1} of ${itemCount}, face down`
                  }
                  style={{
                    rotate: `${fanAngle(index, itemCount)}deg`,
                    zIndex: index,
                  }}
                  className="absolute top-[74px] left-[106px] h-[177px] w-[118px] origin-[50%_219%] rounded-[8px] perspective-[900px] desk:top-[66px] desk:left-[125px] desk:h-[195px] desk:w-[130px] desk:origin-[50%_218%] desk:rounded-[9px]"
                >
                  <span
                    className={cn(
                      "relative block size-full transition-transform duration-280 transform-3d",
                      flipped[index] && "rotate-y-180",
                    )}
                  >
                    {/* The printed back, full-bleed and clipped by the card's
                        own radius (UPDATE-02 §2). */}
                    <span className="absolute inset-0 overflow-hidden rounded-[8px] border border-border-track bg-surface shadow-[0_10px_22px_rgb(46_42_38/0.12)] backface-hidden desk:rounded-[9px]">
                      <Image
                        src="/card-back.svg"
                        alt=""
                        fill
                        sizes="130px"
                        className="object-cover"
                      />
                    </span>
                    {/* Mounted on the flip, not before: a face-down card must not carry
                        its result in the DOM. The flip starts in the same
                        commit, so the face is still edge-on when it appears. */}
                    {flipped[index] ? (
                      <span className="absolute inset-0 rotate-y-180 backface-hidden">
                        <FanCardFace
                          item={item}
                          // A covered card shows ~52px; a chip that wide would
                          // be sliced mid-word, so only the front card has one.
                          showChip={index === frontIndex}
                        />
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>

            {allFlipped ? null : (
              <div className="mt-[14px] flex gap-[6px]" aria-hidden>
                {flipped.map((isFlipped, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-[5px] w-[22px] rounded-[3px]",
                      isFlipped ? "bg-terracotta" : "bg-step-idle",
                    )}
                  />
                ))}
              </div>
            )}

            {/* Never forced to flip one by one — offered once the first card
                is turned. */}
            {flippedCount > 0 && !allFlipped ? (
              <button
                type="button"
                onClick={flipAll}
                className="mt-2 rounded-chip px-3 py-2 text-[12.5px] font-bold text-terracotta transition-colors duration-120 hover:text-terracotta-hover"
              >
                Flip all
              </button>
            ) : null}
          </div>

          <div className="flex-none px-[18px] pb-5 desk:mx-auto desk:w-[320px] desk:px-0">
            {/* One button in both states (UPDATE-02 §3). Disabled reads plain
                "Done" — the dots already count what is left. */}
            <button
              type="button"
              disabled={!allFlipped}
              onClick={async () => {
                await markedRevealed.current;
                router.push("/store/boxes");
              }}
              className={cn(
                "flex h-[50px] w-full items-center justify-center rounded-btn font-display text-[16px] font-semibold transition-colors duration-120",
                allFlipped
                  ? "bg-terracotta text-white shadow-[0_6px_18px_rgb(226_122_84/0.42)] hover:bg-terracotta-hover"
                  : "border border-border-track bg-input text-ink-disabled",
              )}
            >
              Done
            </button>
          </div>

          <PresentedCard
            item={presented === null ? null : items[presented]}
            onClose={() => setPresented(null)}
          />
        </>
      )}
    </div>
  );
}

/** Face-up at fan scale — the rarity card anatomy, header then tile. */
function FanCardFace({
  item,
  showChip,
}: {
  item: RevealedItem;
  showChip: boolean;
}) {
  const tier = rarityTokens(item.rarity);

  const face = (
    <span
      className={cn(
        "flex size-full flex-col overflow-hidden bg-surface text-left",
        item.shiny
          ? "rounded-[6.5px] desk:rounded-[7.5px]"
          : cn(
              "rounded-[8px] border-[1.5px] shadow-[0_10px_22px_rgb(46_42_38/0.12)] desk:rounded-[9px]",
              tier.frame,
            ),
      )}
    >
      <span className="flex flex-col px-[9px] pt-2 pb-[6px] desk:gap-[2px] desk:px-[13px] desk:pt-[11px] desk:pb-[9px]">
        <span className="truncate text-[12px] font-extrabold desk:text-[13px]">
          {item.name}
        </span>
        {item.shiny ? (
          <span className="flex items-center gap-[3px] text-[9.5px] font-bold text-amber-text desk:text-[10px]">
            <Sparkles size={9} strokeWidth={2.8} aria-hidden />
            Shiny
          </span>
        ) : (
          <span className="text-[9.5px] font-bold text-ink-faint desk:text-[10px]">
            {CATEGORY_LABEL[item.category]}
          </span>
        )}
      </span>
      <span className={cn("relative block flex-1", tier.field)}>
        <ArtField
          item={item}
          className="px-7 py-[38px] desk:px-[27px] desk:py-[37px]"
          iconSize={36}
        />
        {showChip ? (
          <span className="absolute bottom-[7px] left-[7px] z-10">
            <RarityChip rarity={item.rarity} />
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!item.shiny) return face;

  return (
    <span className="block size-full rounded-[8px] bg-(image:--gradient-shiny-frame) p-[1.5px] shadow-shiny desk:rounded-[9px]">
      {face}
    </span>
  );
}

/** The tile's contents: the field effect behind, the art centred on top. */
function ArtField({
  item,
  className,
  iconSize,
  floaty = false,
}: {
  item: RevealedItem;
  className: string;
  iconSize: number;
  floaty?: boolean;
}) {
  const fieldFx = item.shiny ? SHINY_WASH : rarityTokens(item.rarity).fieldFx;

  return (
    <>
      {fieldFx ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: fieldFx }}
        />
      ) : null}
      <span
        className={cn("absolute inset-0 block", floaty && "animate-floaty")}
      >
        <ItemWell
          item={item}
          size={0}
          fill
          iconSize={iconSize}
          animalIconSize={iconSize}
          rounded="rounded-none"
          bgClassNameOverride="bg-transparent"
          className={className}
        />
      </span>
    </>
  );
}

/**
 * A flipped card lifted over the fan (UPDATE-02 §3), 250×375. A native
 * `<dialog>` for the focus trap and Esc; its backdrop is the blurred scrim.
 * A tap anywhere but the card closes it, as does ✕.
 */
function PresentedCard({
  item,
  onClose,
}: {
  item: RevealedItem | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) {
      dialog.showModal();
      headingRef.current?.focus();
    }
    if (!item && dialog.open) dialog.close();
  }, [item]);

  const tier = rarityTokens(item?.rarity);
  const sub = item
    ? [
        CATEGORY_LABEL[item.category],
        item.shiny ? "shiny variant" : null,
        // The old reveal's "Added, locked" state (GACHA-14), folded into the
        // sub line rather than a new element on the card.
        item.locked ? `unlocks at level ${item.levelRequired}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={headingId}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0 text-ink backdrop:bg-[rgb(38_30_22/0.46)] backdrop:backdrop-blur-[7px]"
    >
      <div
        className="flex size-full items-center justify-center px-[18px]"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-[calc(20px+env(safe-area-inset-top))] right-[18px] flex size-11 items-center justify-center rounded-full border border-white/32 bg-white/16 text-white transition-colors duration-120 hover:bg-white/28"
        >
          <X size={19} strokeWidth={2.6} aria-hidden />
        </button>

        {item ? (
          <div
            key={item.id + String(item.shiny)}
            className={cn(
              "animate-card-present rounded-[19px] shadow-[0_26px_54px_rgb(0_0_0/0.42)]",
              item.shiny && "bg-(image:--gradient-shiny-frame) p-[2px]",
            )}
          >
            <div
              className={cn(
                "relative flex h-[375px] w-[250px] flex-col overflow-hidden bg-surface",
                item.shiny
                  ? "rounded-[17px]"
                  : cn("rounded-[19px] border-[1.5px]", tier.frame),
              )}
            >
              <div className="flex items-start justify-between gap-2 px-[15px] pt-[13px] pb-[11px]">
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <h2
                    id={headingId}
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-[15px] font-extrabold outline-none"
                  >
                    {item.name}
                  </h2>
                  <p className="text-[11.5px] font-bold text-ink-faint">
                    {sub}
                  </p>
                </div>
                {item.shiny ? <ShinyPill /> : null}
              </div>

              <div
                className={cn(
                  "relative flex-1 overflow-hidden border-t",
                  tier.frame,
                  tier.field,
                )}
              >
                <ArtField
                  item={item}
                  className="px-[33px] py-[44px]"
                  iconSize={96}
                  floaty={item.shiny}
                />
                {tier.sparks || item.shiny ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                  >
                    <span
                      style={{ ["--spark-rotate" as string]: "45deg" }}
                      className="absolute top-[26px] left-[30px] size-[10px] animate-twinkle rounded-[2px] bg-white"
                    />
                    <span
                      style={{
                        ["--spark-rotate" as string]: "45deg",
                        animationDelay: "0.7s",
                      }}
                      className="absolute right-[30px] bottom-[34px] size-[8px] animate-twinkle rounded-[2px] bg-white"
                    />
                    <span
                      style={{ animationDelay: "1.4s" }}
                      className="absolute top-[64px] right-[24px] size-[6px] animate-twinkle rounded-full bg-[#FFF6E2]"
                    />
                  </span>
                ) : null}
                <span className="absolute bottom-[11px] left-[11px] z-10">
                  <RarityChip rarity={item.rarity} size="row" />
                </span>
              </div>

              {tier.sheen || item.shiny ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-[17px]"
                >
                  <span className="absolute top-[-20%] bottom-[-20%] w-[84px] animate-sheen bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.78)_50%,transparent)]" />
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
