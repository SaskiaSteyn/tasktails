# UPDATE-02 · Box artwork, card back, and the reveal overlay

Supersedes the marked parts of `README.md` in this folder. Everything not listed here is unchanged.
Read this **after** the README and after `design_handoff_rarity/UPDATE-01-card-anatomy.md`.

Three changes, in order of blast radius:

1. Lucky boxes now have **real artwork** (closed + open), replacing the `lucide` `Gift` glyph.
2. Face-down cards have a **printed card back**, and every card in the feature is **2:3**.
3. The reveal has **no summary screen**. A flipped card presents over a blurred scrim of the fan, and
   the screen carries **one** button: `Done`.

---

## 1. Box artwork (replaces README §2 "gift glyph", §3 head, §4 wells, §9)

Two new assets, drawn for TaskTails and recoloured to the brand palette:

| File | Use |
|---|---|
| `assets/lucky-box-closed.svg` | every unopened-box representation |
| `assets/lucky-box-open.svg` | the opening beat only (1e) — lid already off, sparkles included |

Both are flat, unshaded SVG in the brand ramp: body `#E27A54` (terracotta), shadow/outline `#C9633F`,
ribbon `#F2B441`, ribbon shade `#D0912A`. No gradients, no strokes to scale. Ship them through the
project's own asset pipeline (`public/`), alongside `public/food/*` and `public/animals/*`.

**Where the closed box replaces the `Gift` glyph** — all of it, at these heights:

| Surface | Well | Art height |
|---|---|---|
| Store box card art tile (1a) | `82px` full-bleed tile | `51px` |
| Desktop box card (1h) | `96px` tile | `59px` |
| Box detail sheet head (1b) | `52px` amber well | `32px` |
| My boxes row (1c) | `52px` amber well | `32px` |
| My boxes empty (1d) | `72px` well | `44px` |
| Opening beat (1e) | `104px` well | `74px`, **open** box |

Rules:
- **Art, not icon.** The illustration does not read below ~26px; anything smaller keeps the line glyph.
  The **bottom-nav and rail icons stay `lucide` `Gift` at `17–18px`** — do not swap those.
- **Empty state (1d) is muted**, not colourful: `filter: grayscale(1); opacity: .45`. It reads as an
  empty shelf; a full-colour box in an empty state looks like an item you already own.
- The `×N` count pill stays exactly as the README specifies, top-right of the art tile.
- Boxes are still **untiered** — artwork changes nothing about that (README §2, open question 2).

## 2. Card back and card aspect (replaces README §5 "Face-down back" and the fan sizes)

**Card back** — `assets/card-back.svg`: a printed fox-motif back, drawn at 150×225 (2:3). It is the
whole card: full-bleed, `object-fit: cover`, clipped by the card's own radius. No glyph, no well, no
"TAP TO FLIP" label — the earlier gift-glyph-in-the-left-strip rule is retired, since the printed
back survives being sliced by the next card in the fan.

Apply it **only to unflipped cards in a reveal**. Box thumbnails everywhere else (store tiles, My
boxes rows, detail sheet) use the closed-box art from §1 — those are boxes, not unturned cards.

**Every card in the feature is 2:3**, matching the artwork:

| Card | Was | Now |
|---|---|---|
| Phone fan card (1f, 1g) | `118×166px`, `rounded-[14px]` | **`118×177px`**, **`rounded-[8px]`** |
| Desktop fan card (1h) | `130×182px`, `rounded-[16px]` | **`130×195px`**, **`rounded-[9px]`** |
| Presented card (1g overlay) | — | **`250×375px`**, `rounded-[17px]` inside a `2px` frame (`rounded-[19px]`) |

**Radius comes from the artwork**, not from the app's card scale: the printed back's own frame corner
measures ~10px at its native 150px width, i.e. ~6.7% of card width — hence 8px at 118px and 9px at
130px. This is deliberately tighter than the store card's `rounded-[15px]`; a reveal card is a playing
card, not a list tile.

**Fan pivots change with the height** so the arc is visually identical to before:

| | rotations | `transform-origin` |
|---|---|---|
| Phone `118×177` | −20 / −10 / 0 / +10 / +20° | `50% 219%` |
| Desktop `130×195` | −20 / −10 / 0 / +10 / +20° | `50% 218%` |

Fan box sizes are unchanged (phone `330×300px`, desktop `380×290px`), as is the reduced-set ladder
(3 cards → −10 / 0 / +10; 1 card → 0°).

## 3. The reveal overlay (replaces README §5 "Shiny pull (1g)" and the footer-button rule)

**There is no haul-summary screen.** The previous 1g was a separate "here is your best card + all five"
screen; it is deleted. The fan screen is the only reveal screen, and a flip is a **presentation over it**:

- Tapping a face-down card flips it (`.28s` Y-axis flip) and it **presents at `250×375px`, centred over
  a scrim**: `rgba(38,30,22,.46)` + `backdrop-filter: blur(7px)`. The scrim covers the whole screen
  including the header; the fan stays visible, blurred, behind it.
- The presented card is the full UPDATE-01 rarity card at large scale — header (name + category /
  variant line) and tier chip in the header, tier field behind the art, art `184×230px` contained,
  tier chip bottom-left of the tile. Shiny adds the iridescent 2px frame, the wash, `floaty` art, one
  sheen sweep and the `✦ Shiny` pill in the header. **The animal art is never recoloured.**
- **Dismiss, two ways, both required:** a `✕` button top-right of the overlay (`44px` circle,
  `rgba(255,255,255,.16)` fill, `1px rgba(255,255,255,.32)` border, `19px` white glyph at 2.6 stroke,
  hover `.28` fill), **and** a tap anywhere on the scrim. Both return to the fan with that card now
  face-up in place. `Esc` closes it on desktop.
- Behind the overlay the fan shows **flipped cards face-up in their fan positions** — that is the
  running record of the haul, so no separate "all 5 cards" strip is needed anywhere.
- Once all cards are turned, the fan screen's headline becomes `All five turned` / `tap any card to see
  it again`; **re-opening an already-flipped card is allowed** and uses the same overlay.

**One button, always `Done`.** It sits in the same place on both states:
- Cards outstanding (1f): disabled — `bg-input`, `1px border-track`, `text-ink-disabled`,
  `h-[50px] rounded-[13px]`, label `Done`. Not "Flip 3 more to finish" — the progress dots already
  count, and a changing label in a disabled button reads as an error message.
- All turned (1g): enabled terracotta `#E27A54`, white, same geometry, `shadow` `0 6px 18px
  rgba(226,122,84,.42)`. `Done` exits the reveal.
- The `Flip all` affordance from README §5 still applies and still reveals the rest in a `.15s`
  stagger — flipping one by one is never forced.
- The progress dots (`22×5px`) stay on 1f and are dropped once all five are turned.

**State delta.** The reveal needs one more piece of local state than the README implies:

```ts
presentedIndex: number | null   // which card is lifted over the scrim; null = fan only
flipped: boolean[]              // per-card, as before
// derived: allFlipped = flipped.every(Boolean)  → enables the single Done button
```

Nothing about persistence changes: results are written at open time (README §7), and an interrupted
reveal still leaves the items owned with no half-flipped fan re-shown.

## 4. Unchanged, to be explicit

Odds and the `RARITY_ODDS` table, pity invisibility, the buy/open split, the four boxes and their
prices, the collapsible store group, the box-button entry point, My boxes and its empty-state pattern,
the desktop rail, and every open question in README §8.

## 5. Files

- `TaskTails Lucky Boxes.dc.html` — the design reference, refreshed; ids 1a–1h as before, with 1g now
  the overlay state rather than a summary screen.
- `assets/lucky-box-closed.svg`, `assets/lucky-box-open.svg`, `assets/card-back.svg` — new artwork.
- `assets/food/*.svg`, `assets/animals/*.svg`, `assets/coin.svg`, `assets/icon.svg` — existing project
  art, bundled for the prototype only.
