# Handoff: TaskTails Lucky Boxes

## Overview
Lucky Boxes become a **buyable object** rather than an instant pull. A box is bought in the Store like
any item, waits **unopened** on a "My boxes" screen, and is opened by the user when they choose. Opening
plays one animation beat, then deals the box's items as **face-down cards the user flips one at a time**.
A new **Shiny** flag can ride on any card, and only ever comes out of a box.

Eight surfaces, all in `TaskTails Lucky Boxes.dc.html` (ids match the board):

| id | Surface |
|---|---|
| 1a | Store · boxes group (collapsible, four box cards) |
| 1b | Box detail · confirm buy sheet |
| 1c | My boxes (unopened list) |
| 1d | My boxes · empty |
| 1e | Opening moment |
| 1f | Reveal · fan of cards |
| 1g | Reveal · shiny pull, presented over the fan |
| 1h | Desktop · rail versions of the store group and the reveal |

## About the design files
HTML **design references**, not production code. Recreate them in the codebase's own components and
tokens. The **implemented codebase remains the source of truth** for component names, copy, data shape
and behaviour (`src/components/store/lucky-box-*.tsx`, `src/lib/gacha.ts`); where this document
conflicts with what ships, raise it rather than changing app behaviour silently.

**Fidelity:** high — sizes, colours, timings and copy below are final.

> ⚠ **Read `UPDATE-02-box-art-and-reveal.md` in this folder alongside this README.** It supersedes the
> gift-glyph box art (§2–§4, §9), the fan card sizes, radii and face-down back (§5), and replaces the
> haul-summary screen with a scrim overlay plus a single `Done` button (§5). Where the two disagree,
> UPDATE-02 wins.

**Depends on:** `design_handoff_rarity/README.md` + **`design_handoff_rarity/UPDATE-01-card-anatomy.md`**.
The revealed cards are rarity cards, and the box cards are `StoreItemCard`s; both follow UPDATE-01's
anatomy. Nothing about card layout is redefined here.

---

## 1. The four boxes

| Box | Items | Price | Shiny odds | Coins / item |
|---|---|---|---|---|
| Lucky Parcel | 1 | 50 | 1 in 60 | 50 |
| Lucky Bundle | 3 | 120 | 1 in 40 | 40 |
| Lucky Haul | 5 | 200 | 1 in 25 | 40 |
| Lucky Trove | 7 | 300 | 1 in 18 | ~43 |

Per-item rarity odds are the shipped `RARITY_ODDS` from `src/lib/gacha.ts` — **55 / 30 / 12 / 3**
(Common / Rare / Epic / Legendary) — rolled independently per item, unchanged by box size. Box size buys
*more rolls*, not better ones; only the **shiny** rate scales with the box.

**Flag · pricing.** The ladder reads 50 / 120 / 200 / 300 for 1 / 3 / 5 / 7 items — 50, 40, 40 and ~43
coins per item, so Lucky Trove is fractionally worse value than Lucky Haul. Either price the Trove at
**280** to keep the ladder strictly improving, or accept the premium as the price of the bigger
single-session open. Product call, not a design one.

Hard pity (`pullsSinceLegendary`, `HARD_PITY_THRESHOLD`) keeps working exactly as shipped and stays
**invisible**: no pity meter, no counter, no "you're due" copy on any surface here.

---

## 2. Store · boxes group (1a)

Boxes sit in **their own group above the catalogue**, inside the normal store scroll — not a separate
tab, not a hero banner.

**Group header** — collapsible:
- Chevron (`14px`, 2.6 stroke, `text-ink-soft`) + label `LUCKY BOXES` (`text-[11px] font-extrabold
  uppercase tracking-[.6px] text-ink-soft`) + count pill `4` (`text-[10px] font-extrabold`,
  `bg-amber-tint text-amber-text`, `rounded-full px-[7px] py-[2px]`).
- The whole header row is the toggle (`min-h-[44px]` hit area). Collapsed: chevron rotates `-90deg`,
  the grid unmounts, the count pill stays — the group is how a returning user finds boxes, so it must
  never disappear entirely.
- Collapsed state persists per user (same store-scoped preference the category filter uses). Default
  **expanded**; collapse once a user has bought a box and has an unopened one waiting is *not* automatic.
- The catalogue's own group headers (`FOOD`, `ANIMALS`, …) gain the same affordance for consistency.

**Box cards** — `StoreItemCard`, no local look-alike:
- 2-up grid on phone (`grid-cols-2 gap-[11px] items-start`), 2-up in the desktop catalogue column
  (1h) — **not** 4 across; that column is ~270px wide and 4 columns collapse the cards.
- **Header:** name (`Lucky Haul`) + sub `5 items · shiny 1 in 25`.
- **Art tile:** the standard `82px` full-bleed well (`96px` in the wider desktop card), `bg-warm`
  field, centred **gift glyph** (`lucide` `Gift`, `42px`, 1.7 stroke, `text-amber-text`) and a
  `×N` count pill top-right — **superseded by UPDATE-02 §1: real box artwork replaces the glyph** — (`text-[10px] font-extrabold`, `bg-amber-tint text-amber-text`,
  `rounded-full px-[7px] py-[2px]`) — the item count is the one thing that distinguishes the four
  cards at a glance, so it is drawn in the tile, not only in the sub line.
- **Footer:** coin + price, `+` add button — the shipped price row, unchanged.
- **Boxes carry no rarity tier.** Frame stays `border-track`, no tier chip, no field effect, no sheen.
  A box's *contents* are tiered; the box is not. (Open question 1.)

**Store header** gains a **box button** (gift glyph, `34px` circle) left of the cart, with an unopened
count badge (`bg-terracotta`, white, `9px/800`) — the entry point to My boxes. Badge hidden at zero.

---

## 3. Box detail · confirm buy (1b)

Tapping a box card raises a bottom sheet over the store (`rounded-t-[26px]`, grab handle, scrim). It is
the only place the odds are published, and it doubles as the buy confirmation — no separate step.

- **Head:** `52px` amber well + gift glyph, name (Fredoka 600, `20px`), sub `5 items, one card at a time`.
- **Chance per item:** label `CHANCE PER ITEM`, then one row per tier: `6px` dot in the tier ink, tier
  name (`12.5px/800`), a bar (track `bg-input`, fill in the tier colour, `6px`, `rounded-full`) and the
  percentage right-aligned (`12px/800`). Values from `RARITY_ODDS`, formatted whole-number.
- **Shiny note:** `bg-warm` panel, `Any card can come back shiny — 1 in 25 from this box. Shiny only
  ever comes from boxes.`
- **Buy:** full-width terracotta button `Buy · 🪙 200`, then a quiet line
  `Balance after: 1,040 coins · opens from My boxes` — the "you are not opening it yet" contract.
- Insufficient balance: button disabled with `Not enough coins` and the line becomes
  `You need 160 more coins`. No upsell.

---

## 4. My boxes (1c) and its empty state (1d)

Reached from the store header's box button.

- **List rows** (not cards): `1px border-track`, `rounded-[15px]`, `bg-surface`, `p-[13px]`,
  `52px` amber well + gift glyph, name (`13.5px/800`), sub `5 items · bought today`, and a terracotta
  **Open** button (`rounded-[11px]`, `13px` Fredoka 600) right-aligned.
- **Newest first.** Duplicates **stack into one row with a `×2` count** rather than repeating; opening
  decrements the count and opens one box.
- A section label `UNOPENED · 4` sits above the list; nothing else lives on this screen.
- **Empty (1d):** keep the chrome, replace the content — `72px` amber well + gift glyph, headline
  `No boxes waiting`, line `Lucky boxes you buy will wait here until you're ready to open them.`, and a
  terracotta `Browse boxes` button back to the store group. Same "replace the content, keep the chrome"
  pattern `LockedByLevelState` and the empty cart already use.

---

## 5. Opening (1e) → reveal (1f, 1g)

**Opening moment (1e).** Extends the shipped `LuckyBoxOpening` beat rather than replacing it: same
`128px` amber well, same soft glow ring, plus a lid that lifts and three light rays. `~1.4s`
(the code's `1.5s` minimum still governs), copy `Opening…` / `5 cards on the way`. Under reduced
motion it **stops dead** — static well, same copy, straight to the fan.

**Fan of cards (1f).** The box's items land face-down in an arc; tapping one flips it and lifts it to
the front.

- Screen: header `Lucky Haul` + `2 of 5 flipped` pill. Content column is **vertically centred**:
  headline `Tap a card`, line `Everything is already yours — this is just the reveal`, the fan, then
  progress dots (`22×5px`, filled `bg-terracotta`, empty `bg-input`).
- **Fan geometry (exact)** — *superseded by UPDATE-02 §2 (2:3 cards, new pivots)*: cards `118×166px`, all at the same origin, `transform-origin: 50% 234%`
  (pivot ~305px below the card centre), rotations **−20 / −10 / 0 / +10 / +20°**. That puts card centres
  ~52px apart: each covered card keeps a readable left strip, and the five-card fan stays inside a
  330px box. Fewer cards use the middle of the same ladder (3 → −10 / 0 / +10; 1 → 0°).
- **Face-down back** — *superseded by UPDATE-02 §2 (printed card back)*: `bg-amber-tint`, `1px border-track`, `rounded-[14px]`, gift glyph (`26px`)
  pinned in the **visible left strip** (`items-start`, `pl-[12px]`) — never centred text or a
  "TAP TO FLIP" label, which the next card slices mid-word.
- **Flipped card:** the rarity card of UPDATE-01 at fan scale — 1.5px tier frame, tier field, name +
  category header, art `62px` contained. The flip is a `.28s` Y-axis flip plus a lift to the front of
  the z-stack. **The tier chip is drawn only on the front-most card**: a covered card exposes ~52px and
  a chip wider than that slices mid-word, so on occluded cards the frame and field colour carry the
  tier — which is what the rarity system asks of colour anyway.
- **Footer button** — *superseded by UPDATE-02 §3 (one `Done` button, both states)*: disabled `Flip 3 more to finish`, becoming terracotta `Done` at `5 of 5`.
  Flipping is never forced — a `Flip all` affordance appears after the first card and reveals the rest
  in a `.15s` stagger.

**Shiny pull (1g)** — *superseded by UPDATE-02 §3: this is now an overlay over the fan, not a summary screen, and closes via `✕` or the scrim.* A shiny card uses the full shiny treatment from the rarity handoff §4: 2px
iridescent gradient frame, wash behind the art, `floaty` art, one sheen sweep, `✦ Shiny` pill beside
the tier chip. **The animal art goes holographic.** One line under the card reads
`Shiny · 1 in 25 from this box`. No extra confetti beat: the card *is* the moment.

---

## 6. Desktop (1h)

The `248px` labelled rail (`AppRail`/`RailNav`) with the store in the content column:

- Same collapsible boxes group, same `StoreItemCard`s, **2-up** in the catalogue column.
- The sidebar category list gains `Boxes 4`.
- The reveal runs in the content column as the **same fan**, centred: `130×182px` cards,
  `transform-origin: 50% 234%`, −20 / −10 / 0 / +10 / +20°, inside a `380×290px` box. The desktop
  column is ~537px, so a flat row of five cards does not fit (sizes now `130×195px` / `50% 218%` — UPDATE-02 §2) — it spills under the rail. Same
  front-most-card-only chip rule as the phone.
- My boxes is a column list in the same content area, not a modal.

---

## 7. Data & state

```ts
// New: an owned, unopened box. gacha.ts today spends coins and grants an item in
// ONE transaction, with nothing owned in between — that is what changes.
interface LuckyBoxDefinition {
  key: 'parcel' | 'bundle' | 'haul' | 'trove';
  name: string;          // "Lucky Haul"
  itemCount: 1 | 3 | 5 | 7;
  coinPrice: number;     // 50 | 120 | 200 | 300
  shinyOneIn: number;    // 60 | 40 | 25 | 18
}

interface OwnedLuckyBox {
  id: string;
  userId: string;
  boxKey: LuckyBoxDefinition['key'];
  purchasedAt: Date;
  openedAt: Date | null;      // null = waiting in My boxes
  results: PullResult[] | null; // written at open time, not at buy time
}
```

Rules:
1. **Buy and open are separate transactions.** Buying debits coins and inserts an unopened row; opening
   rolls the items (existing `pullOnce`/`rollRarity` path, once per item), grants them and stamps
   `openedAt`. Rolling at buy time would let a user see results before the animation.
2. Opening is **idempotent per box row** — a double-tap or a refresh mid-animation must not re-roll.
   The results are persisted before the reveal renders.
3. **Shiny** is a boolean on the granted `InventoryItem`/`Pet` instance, rolled per item at
   `1 / shinyOneIn`. Only box opens can set it.
4. Rarity odds, pity and the level-free pull pool are unchanged from `gacha.ts`.
5. An interrupted reveal (closed app, flipped 2 of 5) leaves the items **already owned**; My boxes shows
   nothing, and the un-flipped cards are simply lost as theatre. Never re-show a half-flipped fan.

---

## 8. Open questions for dev

1. **`StoreItemCategory` has no box.** It is `FOOD | ACCESSORIES | ANIMALS | DECORATIONS`, and a box is
   none of them. A fifth category (or a separate box table) is needed, plus the `OwnedLuckyBox` row
   above. This is the one schema change the feature requires.
2. **Boxes and rarity.** Drawn untiered (see §2). If boxes should read as premium objects, that is a
   separate treatment to design, not a tier value.
3. **Trove pricing** — 300 or 280 (§1).
4. **Retiring the live 150-coin box.** The shipped single box is 150 coins for one item; the Parcel
   replaces it at 50. Existing purchase history and any in-flight copy referring to 150 need a pass.

---

## 9. Assets
**Box art now ships as real SVG artwork — see UPDATE-02 §1.** From the existing project: `assets/coin.svg`, `assets/icon.svg`, `assets/food/{hay,sunflower-seeds,
bananas}.svg`, `assets/animals/panda.svg`. Box art was the `lucide` `Gift` glyph; it is now `assets/lucky-box-{closed,open}.svg` plus
`assets/card-back.svg` (UPDATE-02 §1–§2). Copies of the files used are bundled here for reference only; use the
codebase's own asset pipeline.

## 10. Files
- `TaskTails Lucky Boxes.dc.html` — the design reference (1a–1h). Open in a browser; `support.js` beside
  it is the prototype runtime only, of no product value.
- `assets/` — the five images used by the prototype.

- `UPDATE-02-box-art-and-reveal.md` — **the current delta: box artwork, card back, 2:3 cards, reveal overlay.**

Related: `design_handoff_rarity/UPDATE-01-card-anatomy.md` (the card anatomy every surface here uses),
`design_handoff_rarity/README.md` (tier + shiny colour system), `design_handoff_desktop/README.md`
(the rail), `design_handoff_tasktails/ADDENDUM-store-zoo-art.md` (the shipped store card).
