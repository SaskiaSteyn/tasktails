# Handoff: TaskTails item rarity & shiny variants

## Overview
Adds a visible **rarity tier** to every TaskTails store/inventory item (Common → Legendary) and a separate
**Shiny** flag that can ride on any tier. Rarity is a collectible signal only: it never changes price,
stats, or availability. The design covers three surfaces:

1. **Store cards** (the 4-up grid on the Store screen) — full rarity treatment.
2. **Shiny cards** — the same card with an iridescent overlay stack.
3. **Small surfaces** (cart rows, purchase history rows, zoo list rows) — reduced treatment: tier-coloured
   frame + dot chip, no glow, no motion.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that show the intended look
and behaviour. They are **not production code to copy**. The task is to recreate these designs in the
TaskTails codebase using its existing environment, component structure, and styling approach. If no
component for a store card exists yet, build it in the framework the app already uses.

The **implemented TaskTails codebase remains the source of truth** for component names, copy, data shape,
and behaviour. This document specifies only the rarity visual system. Where it conflicts with what is
already shipped (naming, tier list, item catalogue), raise it rather than silently changing app behaviour.

## Fidelity
**High-fidelity.** All colours, radii, sizes, shadows, and motion timings below are final and exact.
Recreate them 1:1 using the codebase's existing card component and tokens where they match.

---

## The rarity system

Five tiers. Each is distinguished by **three static properties** — frame colour, art-field colour, badge
colours — plus optional field effects and motion at the top two tiers. Colour alone must carry the
distinction; motion is decoration.

| Tier | Frame (1.5px) | Art field | Badge bg / ink | Badge border | Card shadow | Effects |
|---|---|---|---|---|---|---|
| Common | `#EFE7DA` | `#FBF3E6` | `#F4EEE4` / `#8A8178` | `#E8DFD0` | `0 8px 20px rgba(46,42,38,.05)` | none |
| Uncommon | `#CADFCF` | `#EEF5EF` | `#E7F0E9` / `#3F8C63` | `#CBE1D2` | `0 10px 22px rgba(63,140,99,.10)` | tinted frame only |
| Rare | `#BFD5E6` | `#E9F1F6` | `#E4EEF6` / `#3B6E96` | `#C6DCEB` | `0 12px 26px rgba(59,110,150,.14)` | centre highlight + outer glow |
| Epic | `#CFC2E8` | `#EEE9F5` | `#EBE4F6` / `#5C5470` | `#D8CDEC` | `0 14px 30px rgba(92,84,112,.20)` | diagonal ray + stronger glow + sparkles |
| Legendary | `#E9C26A` | `linear-gradient(160deg,#FDF3DE,#FBE3B4)` | `#FBE3B4` / `#8A6410` | `#EBCB84` | `0 16px 34px rgba(200,150,40,.26)` | full-card sheen sweep + sparkles |

**Field effect overlays** (absolutely positioned, `inset: 0`, *behind* the art):
- Rare: `radial-gradient(circle at 50% 30%, rgba(255,255,255,.85), rgba(255,255,255,0) 62%)`
- Epic: `linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,.7) 50%, rgba(255,255,255,0) 62%)`
- Legendary: `radial-gradient(circle at 50% 28%, rgba(255,255,255,.9), rgba(255,255,255,0) 58%)`
- Common / Uncommon: none.

### Rules (product logic)
1. Rarity never changes price, stats, or availability — collection signal only, so no tier is pay-to-win.
2. One tier per item, **set server-side**. The client renders whatever tier it is handed; unknown or missing
   tiers fall back to **Common**.
3. **Shiny is a boolean on the owned instance, not a tier.** It changes the *card only* — iridescent frame,
   tinted field, sheen, sparkles. The animal/item art is **never recoloured**. The tier badge stays visible
   next to the Shiny badge.
4. Motion (sheen sweep, sparkles) appears **only at Epic and above** and must be disabled under
   `prefers-reduced-motion: reduce`.

---

## Screens / Views

### 1. Store card (rarity ladder)
**Purpose:** browse and buy an item; read its rarity at a glance.

**Layout:** grid, `repeat(auto-fit, minmax(230px, 1fr))`, `gap: 20px`.

**Card:**
- `background:#fff`, `border: 1.5px solid <tier.frame>`, `border-radius: 18px`, `overflow: hidden`,
  `position: relative`, `display:flex; flex-direction:column`, `box-shadow: <tier.shadow>`.
- **Art field:** height `170px`, `position:relative; overflow:hidden`, centred flex,
  `background: <tier.field>`. Contains, in z-order: field-effect overlay (`inset:0`) → art
  (`118 × 118px`, `background-size: contain`, centred) → sparkles (Epic+) → tier badge.
- **Tier badge:** top `11px`, left `11px`; `font-size: 10.5px`, `font-weight: 800`,
  `letter-spacing: .55px`, `text-transform: uppercase`; `padding: 4px 8px`, `border-radius: 7px`;
  `background: <tier.badgeBg>`, `color: <tier.badgeInk>`, `1px solid <tier.badgeLine>`; preceded by a
  `7 × 7px` dot in `<tier.badgeInk>`, `gap: 5px`.
- **Name / category block:** `padding: 13px 15px 0`, `border-top: 1px solid <tier.frame>`, `gap: 3px`.
  Name `font-size:14px; font-weight:800; line-height:1.25`. Category `font-size:11.5px; font-weight:700;
  color:#A89E92`.
- **Price / add row:** `padding: 11px 15px 14px`, `space-between`. Coin dot `16 × 16px`, `border-radius:50%`,
  `background:#E5A93C`, `box-shadow: inset 0 0 0 2.4px #F2C879`. Price: Fredoka 600, `16px`, `#B67F1E`.
  Add button `34 × 34px`, `border-radius:10px`, `background:#E27A54`,
  `box-shadow: 0 4px 10px rgba(226,122,84,.3)`, white `+` icon (2.6 stroke); **hover** `#C9633F`.
- **Sheen (Legendary only):** a wrapper `position:absolute; inset:0; overflow:hidden;
  border-radius:18px; pointer-events:none` sitting above the whole card, containing a band
  `top:-20%; bottom:-20%; width:80px`,
  `background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.72) 50%, rgba(255,255,255,0))`,
  animated with `sheen 3.6s ease-in-out infinite`. It sweeps the **entire card**, not just the art field.

**Sparkles (Epic, Legendary):** three small marks inside the art field, each `animation: twinkle 2.4s
ease-in-out infinite` with staggered delays:
- `top:22px; left:26px` — `9 × 9px`, `#fff`, `border-radius:2px`, `rotate(45deg)`, delay `0s`
- `bottom:30px; right:28px` — `7 × 7px`, `#fff`, `border-radius:2px`, `rotate(45deg)`, delay `.8s`
- `top:52px; right:22px` — `5 × 5px`, `#FFF3D6`, `border-radius:50%`, delay `1.5s`

### 2. Shiny card
**Purpose:** show that Shiny is an overlay on top of an ordinary card of any tier.

- **Frame:** outer wrapper `padding: 2px`, `border-radius: 20px`,
  `background: linear-gradient(135deg, #8FD3E8, #C9A7EC 34%, #F5B0C6 62%, #FBD98A)`,
  `box-shadow: 0 14px 30px rgba(140,110,190,.22)`. Inner card `background:#fff; border-radius:18px;
  overflow:hidden; position:relative; height:100%` (no own border).
- **Art field:** height `186px`. Keeps the item's **own** field background — the standard Rare field
  `#E9F1F6` in one example, the `rainbow.png` habitat image (`center/cover`) in the other. The Shiny
  treatment must not depend on, or replace, the item's background.
- **Iridescent wash:** `position:absolute; inset:0`,
  `linear-gradient(135deg, rgba(143,211,232,.30), rgba(201,167,236,.26) 40%, rgba(245,176,198,.24) 70%, rgba(251,217,138,.28))`.
  **Painted behind the art**, so it tints the field only — the animal keeps its true colours.
- **Art:** `130 × 130px`, `contain`, `animation: floaty 4.5s ease-in-out infinite`. **No filter, no
  hue-rotate — never recolour the art.**
- **Overlay layer:** `position:absolute; inset:0; pointer-events:none` containing the sparkles
  (`10px` @ `top:26px left:30px`, `8px` @ `bottom:34px right:30px`, `6px` `#FFF6E2` circle @
  `top:64px right:24px`; `twinkle 2.1s` with `0 / .7s / 1.4s` delays). Because it is a sibling layer with
  `pointer-events:none`, changing the item's field/habitat background must not affect it.
- **Sheen:** same full-card wrapper as Legendary, band `width: 84px`, `rgba(255,255,255,.78)` peak,
  `sheen 3.2s ease-in-out infinite`.
- **Badges:** tier badge (unchanged, e.g. Rare) plus a Shiny pill immediately after it, `gap: 6px`:
  `color:#fff`, `background: linear-gradient(135deg,#7FB8E0,#B58BE6 50%,#E88FB4)`, `border-radius:7px`,
  `padding:4px 8px`, label `✦ Shiny`, same type spec as the tier badge.
- Caption line reads `Animal · shiny variant` / `Animal · shiny · rainbow habitat`.

### 3. Small surfaces (cart, purchase history, zoo list)
**Purpose:** carry the tier in dense rows without glow or motion.

Row: `display:flex; align-items:center; gap:12px`, `background:#fff`,
`border: 1.5px solid <tier.frame>` (full frame — **not** a left rail), `border-radius: 13px`,
`padding: 10px 14px`, `max-width: 640px` column with `gap: 10px`.
- Thumb: `44 × 44px`, `border-radius:10px`, `background:<tier.field>`, art `32 × 32px` contained.
- Name `13.5px/800`; sub-line `<cat> · ×1` `11.5px/700 #A89E92`.
- Tier chip (right, `margin-left:auto`): `10px/800`, `letter-spacing:.5px`, uppercase,
  `background:<tier.badgeBg>`, `color:<tier.badgeInk>`, `border-radius:6px`, `padding:3px 8px`,
  with a `6 × 6px` dot in `badgeInk`.
- Price: Fredoka 600 `14.5px` `#B67F1E`, `width:48px`, right-aligned.
- No shadow, no sheen, no sparkles at any tier.

---

## Interactions & Behavior
- **Add button:** hover `#E27A54 → #C9633F`. Click adds to cart (existing store behaviour, unchanged).
- **Card hover:** no rarity-specific hover state; keep whatever the shipped store card does.
- **Animations** (all decorative, infinite, no state):
  - `sheen` — `0% { translateX(-140%) skewX(-18deg) } 55%,100% { translateX(240%) skewX(-18deg) }`,
    `3.6s` (tier) / `3.2s` (shiny), `ease-in-out`. The pause between sweeps is intentional.
  - `twinkle` — `0%,100% { opacity:0; scale(.4) } 50% { opacity:1; scale(1) }`, `2.4s` / `2.1s`.
  - `floaty` — `0%,100% { translateY(0) } 50% { translateY(-6px) }`, `4.5s` (shiny art only).
- **Reduced motion:** under `@media (prefers-reduced-motion: reduce)` all of the above must be disabled;
  the static colour treatment carries the tier.

## State Management
Effectively stateless presentation. Inputs per item:

```ts
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface StoreItem {
  name: string;
  category: string;   // Food | Accessory | Animal | Habitat | Boost
  price: number;
  art: string;
  rarity: Rarity;     // server-set; unknown/missing → 'common'
  shiny?: boolean;    // per owned instance, not per catalogue item
}
```

Recommended implementation: a single `RARITY_TOKENS: Record<Rarity, RarityTokens>` map holding
`frame / field / fieldFx / shadow / badgeBg / badgeInk / badgeLine / sheen / sparks`, and a card component
that looks tokens up by `item.rarity`. Shiny is a boolean branch that swaps the frame for the gradient
wrapper and appends the wash + overlay + Shiny pill.

The prototype exposes two demo-only toggles (`motion`, `glow`) for reviewing the treatments; they are
review affordances, not product features — do not port them.

## Design Tokens

**Rarity colours** — see the tier table above.

**Base palette (existing TaskTails system, unchanged)**
| Token | Value |
|---|---|
| Page background | `#F7F1E8` |
| Surface / card | `#FFFFFF` |
| Raised surface | `#FBF6EF` |
| Hairline | `#EFE7DA`, `#F4EDE2` |
| Ink | `#2E2A26` |
| Ink muted | `#6F665D` |
| Ink subtle | `#8A8178` |
| Ink faint | `#A89E92` |
| Terracotta (primary) | `#E27A54`; hover / dark `#C9633F` |
| Terracotta tint | `#FBEAE3` |
| Coin gold | `#E5A93C` (inner ring `#F2C879`), coin ink `#B67F1E` |

**Shiny gradient:** `#8FD3E8 → #C9A7EC 34% → #F5B0C6 62% → #FBD98A` (135deg).

**Radii:** `6px` chip · `7px` badge · `10px` thumb/button · `13px` row · `18px` card · `20px` shiny frame.

**Spacing:** `3 · 5 · 6 · 8 · 10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 22 · 24 · 44 · 48px`.

**Typography:** Fredoka 500/600 for display and numerals; Nunito 600/700/800 for UI text.
Sizes used: `10 · 10.5 · 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · 14.5 · 15 · 16 · 17 · 22 · 40px`.

## Assets
From the existing project (`assets/`), all already in the app:
`shop/seeds.png`, `shop/collar.png`, `zoo/penguin.png`, `zoo/koala.png`, `zoo/rainbow.png`.
No new artwork is required — rarity is expressed purely in CSS. Copies of the five files used are bundled
under `assets/` here for reference only; use the codebase's own asset pipeline.

## Files
- `TaskTails Rarity Cards.dc.html` — the rarity design reference (ladder, shiny pair, small surfaces, token
  table). Open it in a browser; `support.js` next to it is the prototype runtime only, of no product value.
- `assets/` — the five item images used by the prototype.

Related reference already in this project: `TaskTails Desktop.dc.html` (store screen the cards live in) and
`TaskTails Style Guide.dc.html` (base palette and type).
