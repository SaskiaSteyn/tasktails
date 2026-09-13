"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";

import { useCartCount } from "@/components/store/cart-count-context";
import { RarityChip } from "@/components/store/rarity-chip";
import { rarityTokens } from "@/lib/rarity";
import { ItemWell, itemSubtitle } from "@/components/store/item-visual";
import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import type { StoreItemWithLock } from "@/lib/store";

/**
 * STOR-01's item card — per-item name, image, coin price, level requirement
 * and availability, matching `design_handoff/TaskTails Screens.dc.html`'s
 * "Store — Group A" frame (STORE item card).
 *
 * The locked-card visual (STOR-04) — desaturated fill, a lock glyph in the
 * art region and an "Unlocks at level N" footer line — replaces STOR-01's
 * plain "Lvl N" label now that this ticket owns it. `#F2EEE7`/`#E9E3D9` (the
 * desaturated card/well fills) have no `@theme` token — nothing else in the
 * design uses this specific muted neutral — so they're arbitrary values,
 * same as `zoo-gallery-card.tsx`'s own raw-hex `border-[#F4D9C9]` for its own
 * no-token accent. The mock draws the lock glyph as hand-built CSS shapes;
 * `ItemWell` uses `lucide-react`'s `Lock` instead, same "real icon, not a
 * drawn shape" call the seed data's own comment already made for the
 * unlocked wells. The footer line lost its pill background and inline lock
 * icon with `ADDENDUM-store-zoo-art.md` — the padlock now reads once, large,
 * in the art region, and repeating it 13px-high in the footer was the mock's
 * pre-addendum layout, not this one's.
 *
 * The "+" is now a real add-to-cart button (STOR-05), posting to STOR-12's
 * `POST /api/store/cart`. Only ever rendered unlocked (a locked card shows
 * the "Unlocks at Lvl N" pill in this same slot instead), so the 403 that
 * route can return for a locked item is a state this button can never
 * actually trigger — nothing here handles it beyond the generic error path.
 * On success, also calls `useCartCount()`'s `increment()` — found live after
 * STOR-06 shipped that the header's cart badge only reflected the count as
 * of the last page load, since it and this button are siblings in the tree
 * with no prop path between them. See `cart-count-context.tsx`.
 *
 * It also calls `router.refresh()` now, which it deliberately did not before:
 * from `xl:` up, `/store` renders the real cart beside the grid (INF-22), and
 * that panel is server-rendered from `cartForUser()` — so a cart add *does*
 * need the page re-fetched, or the rail sits there showing the cart as it was
 * on load. The refresh is a Server-Component re-render, not a navigation:
 * client state elsewhere on the page (the search box, the selected category)
 * survives it, and on a phone, where no rail is drawn, the cost is one
 * cheap request that changes nothing on screen.
 *
 * The category→colour/icon mapping (`CATEGORY_LABEL`, the well itself) lives
 * in `item-visual.tsx` now — factored out when STOR-06's cart rows needed
 * the exact same treatment, so there's one definition instead of two that
 * could drift.
 *
 * `badge` (URG-02/URG-03) is an inert slot, not a fixed component:
 * `StorePage` decides server-side which of `<StockBadge />`/
 * `<CartActivityBadge />` an item gets — at most one, per
 * `urgencyDataForItems()`'s `badgeSelection` — plus two curated exceptions
 * from `design_handoff/ADDENDUM-store-zoo-art.md`'s own art (`<BuyOneGetOneBadge
 * />` for Red collar, `<CurrencyUrgencyBadge overlay />` for Hearts), and
 * only ever unlocked items get one (advertising urgency on something you
 * can't yet buy reads as nonsensical, same call STOR-05's add-to-cart button
 * already made for its own unlocked-only rendering) — this component just
 * renders whatever it's handed, same as `StoreBrowser`'s own
 * `flashSaleBanner` prop. The wrapper around `{badge}` is the card's *only*
 * `position: absolute` element in this corner; every badge component is a
 * plain, unpositioned pill, so the wrapper's `flex flex-col items-end gap-1`
 * still stacks two correctly (Sunflower seeds' curated stock+cart pair)
 * without any special-casing.
 *
 * `design_handoff/ADDENDUM-store-zoo-art.md` adds two more inert slots, both
 * still decided server-side by `StorePage`, same "study-group-aware markup
 * never reaches client code as a boolean" rule: `footerNote` sits above the
 * price row — the addendum's "social-proof line above the price" — for
 * whichever of `<RecentPurchasesBadge />` (URG-04)/`<UrgencyLanguageNote
 * />` (URG-05)/`<BundleTimerBadge />` (URG-06)/`<CurrencyUrgencyBadge />`
 * (URG-07, its default non-`overlay` form) an item's `noteSelection` picked
 * — **fixed 2026-08-25 (#202, "labels are all over the place")**: the
 * latter three used to render through a *third* card slot instead (below
 * the category label), a position `design_handoff` never actually draws;
 * removed entirely rather than left unused, since the addendum's own
 * placement is only ever these two spots per card, never three. `pricing`
 * swaps the plain price for a struck-through list price beside a bold sale
 * price (`fakeDiscountPricing()` in `urgency.ts`) — display only for the
 * per-unit cost, the "+" button still charges `item.coinPrice` per unit.
 *
 * `addQuantity` (#185) is the one thing that isn't display-only: a
 * `BundleTimerBadge` "Buy 2 get 1" item passes `2`, so the "+" posts
 * `quantity: 2` and the card's `pricing` shows the two-unit figure. Defaults
 * to 1 for every other card. Checkout still charges `item.coinPrice` per
 * unit (2 × price for two items); no third item is granted.
 *
 * A locked card is now a real `<button>` (SHR-06): tapping it calls
 * `onLockedClick`, which `StoreBrowser` uses to show the full-screen
 * "locked by level" state in place of the grid. Unlocked cards stay a plain
 * `<div>` — their own interactive part is the "+" button, and a card cannot
 * itself be a `<button>` while nesting one.
 *
 * **#260 — the card itself is a `<div>` either way now.** It used to *be*
 * the `<button>` when locked, and that made the card's flex column a
 * button's child list: older iOS Safari lays a button's contents out in an
 * anonymous shrink-to-fit box rather than stretching them, so on the
 * reporter's iPhone 12 the padlock well drew at exactly its 40px icon
 * width, hard against the card's left edge, and the footer's top border
 * stopped at the end of "Unlocks at level 4". The unlocked `<div>` cards
 * beside it were perfect on the same screen, which is the whole diagnosis:
 * one element type lays out correctly there and the other does not.
 *
 * So the tap target is now an `inset-0` overlay button inside the same
 * `<div>` every card uses, rather than the card being a button. Wrapping
 * the contents in a `width: 100%` child *inside* the button was the smaller
 * diff, but a percentage width resolved against a shrink-to-fit box is the
 * same uncertainty that caused this — matching the element that is known to
 * work on the failing device is not. It also drops the `<p>`/`<div>`-inside-
 * `<button>` nesting the content model never allowed. Locked cards never
 * carry an urgency badge (only unlocked items get one), so the overlay has
 * nothing to sit above but the card's own art. Not reproducible in current
 * desktop WebKit (checked with a QuickLook render), so the iPhone 12 is
 * where this has to be confirmed.
 */

/** How long the post-click checkmark/error state stays up before reverting to "+". */
const FEEDBACK_MS = 1200;

export function StoreItemCard({
  item,
  badge,
  footerNote,
  pricing,
  addQuantity = 1,
  onLockedClick,
}: {
  item: StoreItemWithLock;
  /** Overlaid on the art region, top-right — one badge, or several stacked. */
  badge?: ReactNode;
  /** Stacked above the price row in the footer, e.g. a "sold in the last hour" social-proof line. */
  footerNote?: ReactNode;
  /** Group-B fake discount (`fakeDiscountPricing()`) — struck list price beside a bold sale price, replacing the plain `item.coinPrice` display. Display only for the per-unit cost; the "+" button still charges `item.coinPrice` per unit. */
  pricing?: { list: number; sale: number };
  /** #185 — how many units the "+" adds at once. `2` for a "Buy 2 get 1" `BundleTimerBadge` item (its `pricing` shows the two-unit figure to match); `1` everywhere else. */
  addQuantity?: number;
  /** SHR-06 — only ever called for a locked card; unlocked cards have no use for it. */
  onLockedClick?: () => void;
}) {
  const locked = item.locked;
  const [status, setStatus] = useState<"idle" | "pending" | "added" | "error">("idle");
  // Tracks the pending revert-to-idle timer so a second click's own timer
  // can't be cut short by the first click's — without this, clicking twice
  // within `FEEDBACK_MS` would have the first click's stale timeout reset
  // the second click's still-fresh "added"/"error" state back to idle early.
  const revertTimer = useRef<ReturnType<typeof setTimeout>>(null);
  // #274 — where the fly-to-cart mark starts from. The button, not the art:
  // it is what was actually pressed, so the mark leaves from under the finger.
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const cart = useCartCount();
  const router = useRouter();

  // "2 Sunflower seeds" for a "Buy 2 get 1" bundle item, plain name otherwise —
  // used in the add-to-cart button's label and the sr-only outcome line.
  const addLabel = addQuantity > 1 ? `${addQuantity} ${item.name}` : item.name;

  async function handleAddToCart() {
    if (status === "pending") return;
    if (revertTimer.current) clearTimeout(revertTimer.current);
    setStatus("pending");
    try {
      const response = await fetch("/api/store/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeItemId: item.id, quantity: addQuantity }),
      });
      setStatus(response.ok ? "added" : "error");
      if (response.ok) {
        cart?.increment();
        // #274 — the green tick below is easy to miss on a grid of cards, and
        // says nothing about where the item went. This is the other half:
        // a toast under the cart icon and a mark that travels to it.
        cart?.announceAdded(addLabel, addButtonRef.current);
        router.refresh();
      }
    } catch {
      setStatus("error");
    } finally {
      revertTimer.current = setTimeout(() => setStatus("idle"), FEEDBACK_MS);
    }
  }

  // #276 — the tier this card is drawn in. A locked card is deliberately
  // *not* tiered: it keeps the muted treatment and shows no chip and no
  // effects, because advertising a Legendary nobody can buy reads as a taunt
  // (UPDATE-01 §7 rule 5, the same call the urgency badges already made).
  const tier = rarityTokens(item.rarity);
  const tiered = !locked;

  const cardClassName = cn(
    // `h-full`: fills the grid cell `StoreBrowser` sizes to the tallest
    // card, so every card is the same height (#271).
    "relative flex h-full w-full flex-col overflow-hidden rounded-card",
    // 1.5px at every tier, not Tailwind's 1px `border` — the handoff's frame
    // width is part of what separates the tiers at a glance, and Common's
    // frame colour *is* `border-track`, so an untiered card is what shipped
    // plus half a pixel.
    tiered ? cn("border-[1.5px]", tier.frame, tier.shadow) : "border border-border-track",
    // `bg-surface` (white), not the old `bg-warm` cream tint the pre-addendum
    // card used for its whole body — per the addendum's card art, the card
    // itself is plain white and only the art tile inside it carries a pale
    // category tint (`ItemWell`'s own fill).
    locked ? "bg-[#F2EEE7] text-left transition-colors duration-120 hover:border-checkbox" : "bg-surface",
  );

  /**
   * Epic and Legendary only. Sizes and offsets are UPDATE-01 §2's rescale of
   * the reference's 170px figures onto this card's 82px tile.
   *
   * The rotation rides in `--spark-rotate` rather than a `rotate-45` class:
   * `twinkle` animates `transform`, and an animated transform replaces a
   * class-set one outright rather than composing with it.
   */
  const sparkles = tier.sparks ? (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span
        style={{ ["--spark-rotate" as string]: "45deg" }}
        className="absolute top-[9px] left-[12px] size-[6px] rounded-[2px] bg-white animate-twinkle"
      />
      <span
        style={{ ["--spark-rotate" as string]: "45deg", animationDelay: "0.8s" }}
        className="absolute right-[14px] bottom-[10px] size-[5px] rounded-[2px] bg-white animate-twinkle"
      />
      <span
        style={{ animationDelay: "1.5s" }}
        className="absolute top-[24px] right-[10px] size-[4px] rounded-full bg-[#FFF3D6] animate-twinkle"
      />
    </span>
  ) : null;

  const content = (
    <>
      {/* Art region — leads the card (#271). `design_handoff_rarity`'s own
          card is drawn art-first: the tile spans the card's full width at
          the top with the tier chip floating in it, and the name, category
          and price read underneath. UPDATE-01 §2 had re-cut the rarity
          treatment onto the older header → art → footer order instead; the
          rarity reference's anatomy is what ships, so the header block that
          used to sit above this is now the name block below it.

          Full-bleed: no card padding around it and no corner radius of its
          own — the card's `overflow-hidden` clips it against the rounded
          corners. */}
      <div className="relative">
        {/* #276 — the tier chip, at the tile's **bottom**-left.

            It was top-left, opposite the urgency badges' top-right corner,
            which is what UPDATE-01 §2 warned about and what shipping it
            proved: opposite corners is not the same as clear of each other.
            A Group B card is ~139px wide in the two-up phone grid, and
            "COMMON" (~72px) beside "Only 3 left!" (~74px) plus two 8px
            insets needs 162px. `CurrencyUrgencyBadge overlay`'s "Double XP
            this hour only!" is ~134px on its own and covered the chip
            outright. Group A has no badges, so the top-left chip looked
            correct on every screen that has one.

            Bottom-left is UPDATE-01 §4's own fallback for the crowded case,
            promoted to the only case: the badges keep the whole top edge,
            rarity keeps the bottom, and no width of badge copy can reach it.
            The Epic/Legendary sparkles sit bottom-*right*, so they don't
            meet it either. */}
        {tiered ? (
          <div className="absolute bottom-2 left-2 z-10">
            <RarityChip rarity={item.rarity} />
          </div>
        ) : null}

        {badge && (
          <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
            {badge}
          </div>
        )}
        <ItemWell
          item={item}
          locked={locked}
          // 120, not the 96 this shipped at (#271, reported live): the chip
          // floats at `top-2` and is ~17px tall, so on a 96px tile a centred
          // 62px piece of art started 17px down and the chip sat on top of
          // it — plainly wrong on the Moustache and the Penguin kit, whose
          // ink reaches the top of their own boxes. At 120 the art starts
          // 29px down, four clear pixels under the chip, with no change to
          // the art's own size or centring.
          size={120}
          iconSize={locked ? 44 : 36}
          animalIconSize={62}
          rounded="rounded-none"
          fullWidth
          bgClassNameOverride={tiered ? tier.field : undefined}
          fieldFx={tiered ? tier.fieldFx : null}
          overlay={sparkles}
        />
      </div>

      {/* Name + category. The hairline that used to close the art tile from
          below (the old footer's `border-t`) is this block's `border-t` now —
          the same line in the same place, still directly under the tile. */}
      <div
        className={cn(
          "border-t px-[11px] pt-[9px]",
          tiered ? tier.frame : "border-border-track",
        )}
      >
        <p
          className={cn(
            "truncate text-[12.5px] font-extrabold",
            locked && "text-ink-disabled",
          )}
        >
          {item.name}
        </p>
        <p className={cn("text-[10px]", locked ? "text-ink-disabled" : "text-ink-faint")}>
          {itemSubtitle(item)}
        </p>
      </div>

      {/* `mt-auto`: the card is stretched to the tallest card in the grid
          (#271), and this pins the footer note and the price row to the
          bottom so the extra height opens *above* them. Price rows and "+"
          buttons line up across every card; the note stays directly on top of
          the price it belongs to rather than floating under the subtitle. */}
      <div className="mt-auto px-[11px] pt-[8px] pb-[10px]">
        {footerNote}

        {locked ? (
          /* Plain centred line, not the pre-addendum lock-icon pill — the
             padlock reads once, large, in the art region above, and the
             footer is bare text ("Unlocks at level 7").

             `min-h-[28px]`: the unlocked footer's height is set by its 28px
             "+" button, and a bare text line sat ~14px lower. The grid now
             stretches every card to one height (#271), so this no longer
             decides the card's height — it keeps this line vertically centred
             on the same band the price row and "+" occupy on the unlocked
             card beside it. */
          <p className="flex min-h-[28px] items-center justify-center text-center text-[11px] font-extrabold text-ink-soft">
            Unlocks at level {item.levelRequired}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-[4px]">
              <Coin size={12} />
              {pricing ? (
                <span className="flex items-baseline gap-[5px]">
                  <span className="text-[10px] font-bold text-ink-disabled line-through">
                    {pricing.list.toLocaleString("en-US")}
                  </span>
                  <span className="text-[12px] font-extrabold text-amber-text">
                    {pricing.sale.toLocaleString("en-US")}
                  </span>
                </span>
              ) : (
                <span className="text-[12px] font-extrabold text-amber-text">
                  {/* Locale pinned explicitly — see `coin.tsx`'s `CoinPill` for
                      the hydration mismatch this avoids. */}
                  {item.coinPrice.toLocaleString("en-US")}
                </span>
              )}
            </span>

            <button
              ref={addButtonRef}
              type="button"
              onClick={handleAddToCart}
              disabled={status === "pending"}
              aria-label={`Add ${addLabel} to cart`}
              className={cn(
                "flex size-[28px] flex-none items-center justify-center rounded-[9px] text-[16px] leading-none text-white transition-colors duration-120",
                status === "error"
                  ? "bg-urgency"
                  : status === "added"
                    ? "bg-sage"
                    : "bg-terracotta hover:bg-terracotta-hover disabled:opacity-70",
              )}
            >
              {status === "added" ? (
                <Check size={14} strokeWidth={2.6} aria-hidden />
              ) : status === "error" ? (
                <X size={14} strokeWidth={2.6} aria-hidden />
              ) : (
                <span aria-hidden>+</span>
              )}
            </button>

            {/* Visual-only for "pending"/"idle" — the icon swap on the button
                itself is silent to a screen reader, so the outcome that
                matters (added or failed) gets announced here instead. */}
            <span role="status" aria-live="polite" className="sr-only">
              {status === "added"
                ? `Added ${addLabel} to cart`
                : status === "error"
                  ? `Couldn't add ${addLabel} to cart`
                  : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={cardClassName}>
      {content}

      {/* #276 — Legendary only. Above the whole card, not just the art tile,
          so the glint crosses the header and footer too. `overflow-hidden`
          on this wrapper (not the band) is what stops it painting outside
          the card's rounded corners; the band is deliberately taller than
          the card so a skewed edge never shows a horizontal seam. */}
      {tiered && tier.sheen ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-card"
        >
          <span className="absolute top-[-20%] bottom-[-20%] w-[64px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.72)_50%,transparent)] animate-sheen" />
        </span>
      ) : null}

      {locked ? (
        // The whole card is still the tap target (SHR-06) — it just isn't the
        // element wrapping the layout any more (#260). `rounded-card` so the
        // focus ring follows the card's corners rather than a square.
        <button
          type="button"
          onClick={onLockedClick}
          aria-label={`${item.name}, locked until level ${item.levelRequired}`}
          className="absolute inset-0 rounded-card"
        />
      ) : null}
    </div>
  );
}
