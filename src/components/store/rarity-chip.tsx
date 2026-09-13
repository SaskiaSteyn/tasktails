import type { StoreItemRarity } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { rarityLabel, rarityTokens } from "@/lib/rarity";

/**
 * #276 — the tier chip, and the frame/thumb treatment the dense rows share.
 *
 * One module so the store card and the four row surfaces (cart rail,
 * purchase history, sell list, feed sheet) cannot drift apart, which is
 * exactly what UPDATE-01 is correcting: the defect it names is several
 * surfaces each drawing "a card" their own way.
 *
 * Rows get the frame, the tinted thumb and the chip — and deliberately **no
 * shadow, no sheen and no sparkles at any tier** (UPDATE-01 §5). A dense
 * list of twinkling rows would be unreadable, and the tier is already
 * legible from colour alone.
 */

/**
 * The chip. `size` is the only difference between the card header's and a
 * row's: 9.5px on the card (where it shares a line with the name) and 10px
 * in a row (where it sits alone at the end).
 */
export function RarityChip({
  rarity,
  size = "card",
  className,
}: {
  rarity: StoreItemRarity | null | undefined;
  size?: "card" | "row";
  className?: string;
}) {
  const tokens = rarityTokens(rarity);

  return (
    <span
      className={cn(
        "flex flex-none items-center gap-[4px] border font-extrabold uppercase",
        tokens.chipBg,
        tokens.chipInk,
        tokens.chipLine,
        size === "card"
          ? "rounded-[6px] px-[6px] py-[2px] text-[9.5px] tracking-[.5px]"
          : "rounded-[6px] px-2 py-[3px] text-[10px] tracking-[.5px]",
        className,
      )}
    >
      {/* `currentColor`, so the dot can never drift from the chip's ink. */}
      <span aria-hidden className="size-[6px] flex-none rounded-full bg-current" />
      {rarityLabel(rarity)}
    </span>
  );
}

/**
 * A dense row's own frame — a full 1.5px border in the tier's colour, never
 * a left rail (the README is explicit about that).
 */
export function rarityRowFrame(rarity: StoreItemRarity | null | undefined): string {
  return rarityTokens(rarity).frame;
}

/** A row thumb's fill — the tier's field, gradient included at Legendary. */
export function rarityThumbFill(rarity: StoreItemRarity | null | undefined): string {
  return rarityTokens(rarity).field;
}
