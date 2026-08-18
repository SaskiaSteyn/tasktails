# TaskTails — Handoff Addendum: Zoo gallery + Store (A & B) art refresh

Supplements the main handoff (`design_handoff_tasktails/README.md`) — same tokens, fonts, palette. Screens live in `TaskTails Screens.dc.html` (Store group + Petting zoo group). This addendum covers three screens updated with real illustrated art and the Group-B pricing/urgency treatment.

## New assets (copied into `assets/`)
- `assets/zoo/fox.png`, `assets/zoo/koala.png`, `assets/zoo/penguin.png` — 500×500 transparent pet portraits.
- `assets/zoo/rainbow.png`, `assets/zoo/bows.png`, `assets/zoo/water.png` — 1080×1080 seamless pattern tiles (per-pet card backgrounds).
- `assets/shop/seeds.png`, `assets/shop/collar.png` — 500×500 transparent item art.
- `assets/shop/hearts.png` — 1080×1080 seamless heart pattern (used as the decoration item's art).
Originals are the user-supplied uploads; these are the clean-named working copies the screens reference.

---

## 1. Zoo gallery
2-column grid of owned-pet cards + a dashed "Add another friend" slot. Card structure (top → bottom):
- **Header strip** (`#FBF6EF`, bottom border `#EFE7DA`): pet name (Fredoka 600, 15px) + a **mood face** SVG on the right.
- **Art region** (height 120): the pet's pattern tile as `background: center/cover`, pet PNG centered (~96–104px, `object-fit:contain`, soft drop-shadow).
- **Footer** (white, padding 10/11): two stat rows — **happiness** (heart icon) then **hunger** (utensils icon). Each row = black 13px Lucide icon + an 8px rounded track (`#EFE7DA`) with a colored fill.

**Mood face + bar color are driven by state and must agree:**
| Pet | Pattern | Mood face | Happiness | Hunger | Bar color |
|-----|---------|-----------|-----------|--------|-----------|
| Mochi (fox) | rainbow | happy (smile) | 82% | 76% | green `#5FA97E` |
| Kobi (koala) | bows | neutral (flat) | 55% | 48% | amber `#E5A93C` |
| Waddles (penguin) | water | sad (frown) | 14% | 8% | red `#E4573C` |

- Mood face: 21px circle, two dot eyes, mouth arc = smile / flat line / frown, stroke `#5B5249`.
- A pet in the low/red band also gets a warning card border (`#F4D9C9`) instead of `#EFE7DA`.
- Bar fill width = the stat %. Band thresholds (design intent): green ≳65, amber ~35–65, red ≲35 — apply the same band to face + both bars.
- Body is `overflow-y:auto` (cards are taller now).

---

## 2. Store — Group A (control, neutral)
Card structure now: **header** (title 12.5px 800 + subtitle 10px `#A89E92`, e.g. "Common food") → **art tile** (height 82, pale tint bg, item PNG `object-fit:contain`; the decoration item uses the hearts pattern as the tile bg) → **footer** (top border `#F1E8DA`): coin dot + price (gold `#B67F1E`) on the left, orange `+` button (28×28, radius 9) on the right.

- **Categories** (chips, `overflow-x:auto`): All (active) · Food · Accessories · Animals · Decorations.
- Items: Sunflower seeds / Common food / 40 · Red collar / Common accessory / 65 · Hearts / Common decoration / 30 · **Dassie kit** (locked) / Rare animal — greyed card, centered lock, footer "Unlocks at level 7" (no price/+).
- **No urgency, no discounts** — this is the clean control. Do not add flash-sale or struck pricing here.

## 3. Store — Group B (dark-pattern variant)
Same card layout and category chips as A, plus the manipulation layer:

- **Flash-sale banner** (below search): red `#DB4C3F`, lightning icon, "Flash sale · everything 20% off", live MM:SS countdown pill (`{{ saleTimer }}`) on the right.
- **Urgency badges** overlaid on the art region (absolute, top-right unless noted):
  - Sunflower seeds: "Only 4 left!" (red) + "In 7 carts" (amber), stacked.
  - Red collar: "Buy 1 get 1" (purple `#8478C4`).
  - Hearts: "Double XP this hour only!" (red), top-centered.
- **Fake discount pricing** — applied to every purchasable Group-B item. Rule: take the base price, **inflate +20% and show it struck-through**, then set the **sale price = inflated × 0.8** (nets ≈ base). Struck price is grey `#B8AFA4 line-through`; sale price is the bold gold value.
  | Item | Base | List (struck) | Sale |
  |------|------|---------------|------|
  | Sunflower seeds | 40 | 48 | 38 |
  | Red collar | 65 | 78 | 62 |
  | Hearts | 30 | 36 | 29 |
- **Social-proof line above the price** (footer becomes a stacked column) on *some* cards: flame icon + red text.
  - Sunflower seeds: "12 sold in the last hour".
  - Hearts: "4 sold in the last hour".
  - (Collar has no sold-line; its urgency is the Buy-1-get-1 badge.)
- Dassie kit locked card is identical to Group A's (no discount/urgency).
- The "Dark-pattern layer" legend card beside Group B catalogues the 7 prioritised urgency stimuli; numbered pins were removed from the screen, so the legend now reads as a catalogue, not a pinned map.

### Implementation notes
- All prices, counts, "sold" numbers, stock, and cart figures are **fabricated study stimuli** — wire them to config/mock data, not real inventory.
- Group A vs B is the A/B research split: keep item set, art, and layout identical between them so the only differences are the urgency/discount treatments.
- Countdown timers (`saleTimer`) should tick live; when they expire, loop or reset per the study protocol rather than revealing the real (near-identical) price.
