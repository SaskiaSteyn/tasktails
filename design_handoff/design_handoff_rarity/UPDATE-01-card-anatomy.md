# Update 01 — one card anatomy everywhere

**Amends:** `design_handoff_rarity/README.md` §"Screens / Views" 1–3
**Status:** supersedes the card *layout* in that README. The rarity **colour system** (tier tokens,
shiny gradient, effects, product rules) is unchanged except for the tier-list correction in §3 below.
**Fidelity:** high — sizes, colours and placements here are final.

---

## 1. What changes and why

The rarity reference draws its cards **art-first**: a 170px art field at the top with the tier badge
floating in it, name and category underneath, price row last. The shipped store card
(`src/components/store/store-item-card.tsx`, per `design_handoff/ADDENDUM-store-zoo-art.md`) is the
opposite and is what users actually see today:

```
header   name + subtitle          ← leads the card
art      full-bleed tile (82px)   ← edge-to-edge, no radius of its own
footer   price + "+"              ← separated by a hairline
```

Two anatomies for the same object is the actual defect: the store grid, the cart rail, the Lucky Box
cards and the rarity mocks all draw a "card" and none of them agree on where the name sits. **The
shipped header → art → footer anatomy wins.** It is already in production, it survives a long name
(the header truncates rather than shoving the art down), it keeps the price row a fixed height across
locked/unlocked/discounted variants, and it is the layout the two-up phone grid was tuned for.

So: the rarity treatment gets **re-cut onto that anatomy**, and every other card and card-like row in
the app is brought to the same recipe. Nothing about the rarity *palette* is being reopened.

---

## 2. The card (canonical)

One component — `StoreItemCard` — for every catalogue card. Boxes, sell cards and reveal cards are
variants of it, never look-alikes rebuilt locally.

**Grid:** phone `grid-cols-2`, `gap-[11px]`, `items-start` (unchanged). Desktop `/store` rail keeps
the same card at the same metrics; do **not** widen the card to fill a wide column — add columns.

**Card shell**
- `bg-surface` (white), `rounded-card`, `overflow-hidden`, `relative`, `flex flex-col`.
- Border: **`1.5px solid <tier.frame>`** — replaces `border border-border-track`. Common's frame *is*
  `border-track`, so an untiered/Common card is visually identical to today apart from the .5px.
- Shadow: `<tier.shadow>` (§3). No shadow on Common.

**Header** — `px-[11px] pt-[10px] pb-[9px]`
- Name `text-[12.5px] font-extrabold`, `truncate`.
- Subtitle `text-[10px] text-ink-faint` — `itemSubtitle(item)`, unchanged.
- **Tier chip** sits here, right-aligned on the name's row (`flex items-start justify-between gap-2`):
  `text-[9.5px] font-extrabold uppercase tracking-[.5px]`, `px-[6px] py-[2px]`, `rounded-[6px]`,
  `bg-<tier.chipBg> text-<tier.chipInk>`, preceded by a `6px` dot in `chipInk`, `gap-[4px]`.
  *This is the one placement change from the reference:* the badge moves out of the art tile so the
  tile's `top-2 right-2` slot stays free for the urgency badges (`StockBadge`,
  `CartActivityBadge`, …), which already own that corner and must not stack with rarity.

**Art tile** — `ItemWell`, `size={82}`, `fullWidth`, `rounded="rounded-none"` (unchanged geometry)
- Fill: **`<tier.field>`** instead of the category tint. `ItemWell` gains a `field` override; when
  it is absent (pet customizer, feed sheet) the category tint stays as-is.
- Field effect: absolutely-positioned `inset-0` layer **behind the art**, `<tier.fieldFx>` (§3).
- Sparkles (Epic, Legendary) — rescaled for the 82px tile, `pointer-events-none`:
  `6px` `#fff` rounded-[2px] rotate-45 @ `top-[9px] left-[12px]`, delay `0s`;
  `5px` `#fff` rounded-[2px] rotate-45 @ `bottom-[10px] right-[14px]`, delay `.8s`;
  `4px` `#FFF3D6` circle @ `top-[24px] right-[10px]`, delay `1.5s`. `twinkle 2.4s ease-in-out infinite`.
- The art itself is **never** recoloured, filtered or hue-rotated at any tier.

**Footer** — `px-[11px] py-[10px]`, `border-t border-<tier.frame>` (replaces `border-border-track`)
- `footerNote` slot above the price row — unchanged.
- Price row unchanged: `Coin size={12}`, price `text-[12px] font-extrabold text-amber-text`,
  add button `size-[28px] rounded-[9px] bg-terracotta` → `hover:bg-terracotta-hover`, check/X
  feedback states as shipped.
- Locked footer unchanged: centred `min-h-[28px]` "Unlocks at level N", padlock in the art tile.

**Legendary sheen** — full-card wrapper above everything: `absolute inset-0 overflow-hidden
rounded-card pointer-events-none`, band `top-[-20%] bottom-[-20%] w-[64px]` (narrowed from 80px for
the two-up card), `linear-gradient(90deg, transparent, rgba(255,255,255,.72) 50%, transparent)`,
`sheen 3.6s ease-in-out infinite`.

**Reduced motion:** `prefers-reduced-motion: reduce` **or** `UserSettings.reduceMotion` disables
sheen, twinkle and floaty. Colour carries the tier on its own.

---

## 3. Tier list correction — four tiers, not five

The README's five-tier ladder does not exist in the product. `StoreItemRarity` is
`COMMON | RARE | EPIC | LEGENDARY` (`prisma/schema.prisma`, `RARITY_ODDS` in `src/lib/gacha.ts`,
`RARITY_STYLE` in `lucky-box-home.tsx`, `achievement-style.ts`). **Uncommon is retired**, and the
reference's blue Rare goes with it — the shipped colour family for Rare is sage, and the Lucky Box
and achievement screens already ship it that way. Any surface still drawing a blue Rare is wrong.

| Tier | Frame (1.5px) | Art field | Chip bg / ink | Card shadow | Effects | Shipped token family |
|---|---|---|---|---|---|---|
| Common | `#EFE7DA` | `#FBF3E6` | `#F4EEE4` / `#8A8178` | none | none | `border-track` / `bg-input` / `text-ink-soft` |
| Rare | `#CADFCF` | `#EEF5EF` | `#E7F0E9` / `#3F8C63` | `0 10px 22px rgba(63,140,99,.10)` | tinted frame only | `sage` / `bg-sage-tint` / `text-sage-text` |
| Epic | `#CFC2E8` | `#EEE9F5` | `#EBE4F6` / `#5C5470` | `0 14px 30px rgba(92,84,112,.20)` | diagonal ray + glow + sparkles | `violet` / `bg-violet-tint` / `text-violet-text` |
| Legendary | `#E9C26A` | `linear-gradient(160deg,#FDF3DE,#FBE3B4)` | `#FBE3B4` / `#8A6410` | `0 16px 34px rgba(200,150,40,.26)` | full-card sheen + sparkles | `amber` / `bg-amber-tint` / `text-amber-text` |

**Field effects** (`inset-0`, behind the art):
- Rare — `radial-gradient(circle at 50% 30%, rgba(255,255,255,.85), rgba(255,255,255,0) 62%)`
- Epic — `linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,.7) 50%, rgba(255,255,255,0) 62%)`
- Legendary — `radial-gradient(circle at 50% 28%, rgba(255,255,255,.9), rgba(255,255,255,0) 58%)`
- Common — none.

`rarity` is nullable in the schema: **null → Common**, same fallback `feedEffectOf()` already uses.

Implementation: one `RARITY_TOKENS: Record<StoreItemRarity, RarityTokens>` holding
`frame / field / fieldFx / shadow / chipBg / chipInk / sheen / sparks`, exported from a single module
and consumed by the card, the rows and the reveal. `lucky-box-home.tsx`'s local `RARITY_STYLE` and
`achievement-style.ts`'s per-key colours should read from it rather than keeping private copies.

---

## 4. Shiny on the new anatomy

Shiny is still a boolean on the owned instance, not a tier, and still changes only the card.

- **Frame:** wrapper `p-[2px] rounded-[calc(var(--radius-card)+2px)]`,
  `background: linear-gradient(135deg,#8FD3E8,#C9A7EC 34%,#F5B0C6 62%,#FBD98A)`,
  `box-shadow: 0 14px 30px rgba(140,110,190,.22)`. Inner card is the standard card with **no border**.
- **Field:** keeps the item's own tier field (or habitat image) plus the iridescent wash
  `linear-gradient(135deg, rgba(143,211,232,.30), rgba(201,167,236,.26) 40%, rgba(245,176,198,.24) 70%, rgba(251,217,138,.28))`,
  painted **behind** the art. Art keeps its true colours; `floaty 4.5s` only.
- **Chips:** tier chip stays, `✦ Shiny` pill immediately after it in the header row, `gap-[6px]`,
  `text-white`, `linear-gradient(135deg,#7FB8E0,#B58BE6 50%,#E88FB4)`, same type spec.
- **Sheen:** as Legendary, band `w-[68px]`, `.78` peak, `3.2s`.
- On a phone card the header row is name + tier chip + Shiny pill: if the name would truncate below
  ~8 characters, the tier chip drops to the art tile's bottom-left and only the Shiny pill stays in
  the header.

---

## 5. Rows (dense surfaces) — unchanged treatment, one recipe

Cart rows, purchase history, sell list, feed sheet: keep §3 of the README exactly — full
`1.5px <tier.frame>` border (never a left rail), thumb `44px` at `<tier.field>`, tier chip right of
the name block, **no shadow, no sheen, no sparkles at any tier**. The only change is that these rows
read the same `RARITY_TOKENS` module as the card, and the four-tier list of §3 above applies.

---

## 6. Surface checklist

Every one of these draws a card or card-like row and must end up on the recipe above.

| Surface | File | Change |
|---|---|---|
| Store grid card | `store/store-item-card.tsx` | tier frame + field + chip + shadow/effects; chip in header |
| Store grid | `store/store-browser.tsx` | none (grid metrics unchanged) |
| Art tile | `store/item-visual.tsx` | `ItemWell` gains `field` override; category tint stays the default |
| Store skeleton | `app/(app)/store/loading.tsx` | mirror the header/tile/footer regions (already does) |
| Lucky Box cards | `store/lucky-box-card.tsx` | rebuild on `StoreItemCard` anatomy; **boxes carry no tier** — Common frame, gift glyph + `×N` count in the tile |
| Sell card | `store/sell-items-card.tsx` | same anatomy, same footprint |
| Box reveal card | `store/lucky-box-opening.tsx`, `lucky-box-home.tsx` | full tier treatment (this is the payoff moment); shiny per §4 |
| Cart rail rows | `store/cart-panel.tsx` | §5 |
| Purchase history rows | `app/(app)/store/history/page.tsx` | §5 |
| Sell list rows | `profile/sell-items-list.tsx` | §5 |
| Feed sheet rows | `pets/feed-sheet.tsx` | §5 (food rarity already drives `feedEffectOf`) |
| Zoo gallery card | `pets/zoo-gallery-card.tsx` | header → art → footer anatomy + tier frame; its own `#F4D9C9` accent retires |
| Animal card | `pets/animal-card.tsx` | anatomy only if it reads as a card; tier frame from the pet's `storeItem.rarity` |
| Achievement tiles | `profile/achievement-style.ts` | read `RARITY_TOKENS` instead of the private colour map |
| Locked card | `store/locked-by-level-state.tsx` | unchanged behaviour; locked cards get **no** tier treatment (muted fill wins) |

---

## 7. Rules that do not change

1. Rarity never affects price, stats or availability — collection signal only.
2. Tier is server-set; the client renders what it is handed; null → Common.
3. Item/animal art is never recoloured, at any tier, shiny included.
4. Motion only at Epic and above, and never under reduced motion.
5. Locked cards keep the desaturated `#F2EEE7` / `#E9E3D9` treatment and the padlock in the tile —
   a locked item shows no tier chip and no effects (advertising a Legendary you cannot buy reads
   as a taunt, same call the urgency badges already made).
6. The card is a `<div>`; the "+" and the locked overlay are the only buttons (#260 stands).

## 8. Open questions

1. **Boxes and tiers.** Lucky Boxes are not catalogue items and have no `rarity`. Drawn Common-framed
   here. If boxes should read as a premium object, that is a separate treatment, not a tier.
2. **Untiered placeholders.** The 7 INF-20 placeholder items still carry `rarity: null` and will all
   render Common. Fine for the study; worth confirming GACHA-03's catalogue lands before this ships.
3. **Uncommon.** Confirming the retirement in writing: no surface, copy string or seed row should
   mention Uncommon after this update.
