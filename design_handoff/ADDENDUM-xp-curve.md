# TaskTails — Handoff Addendum: XP Level Curve v5 (20 Levels, Capped)

**IMPLEMENTED 2026-08-11.** Superseded the "XP Level Thresholds" and "Store
Level Gates & Coin Prices" tables in `claude-memory/economy_system.md`, the
10-level cap in `src/lib/levels.ts`, `prisma/seed.ts`'s catalogue
`levelRequired` values, `Requirements.md` §3.6–3.7, and v1–v4 of this
addendum. Closes GitHub issue
[#160](https://github.com/SaskiaSteyn/tasktails/issues/160) ("too easy to
gain xp and level up").

Before implementing, a conflict surfaced in `prisma/seed.ts`'s own doc
comments: Fox (old Lvl 7) and Penguin (old Lvl 10) were special-cased,
separately from the rest of the catalog, to match the study's old "second/
third animal type" exposure timing — not just cost order. Johan confirmed
(2026-08-11) the full cost-ascending remap should apply to them too (Fox→12,
Penguin→15), retiring that narrative in favor of all 22 animals spreading
through the curve like every other category. `Requirements.md` was also
fixed in the same pass — it had been stale across two rebalances.

## Pacing targets and the two personas they imply

| Persona | Daily XP pace | Basis |
|---|---|---|
| Normal use | ~150 XP/day | Unchanged assumption from `economy_system.md` (~5 tasks/day) |
| Hard grinding | ~460 XP/day | 92% of the 500 XP daily cap, sustained every day — what "hard grinding" has to mean if it's faster than normal use |

Target: **Level 10 = 1,050 XP** (reached in exactly 7 days at 150 XP/day).
Target: **Level 20 = 5,500 XP** (reached in exactly 12 days at ~460 XP/day).

Checking a normal-pace user against the *hard-grind* target: at 150 XP/day
they're only at 1,800 XP by day 12 — Level 12, nowhere near 20. At day 14
(full study length) they reach ~2,100 XP — Level 13. A low performer
(~70 XP/day) reaches ~980 XP by day 14 — Level 9. So the spread does what it's
supposed to: normal use comfortably clears half the curve, finishing the
curve is realistically grind-only.

## New table

| Level | Cumulative XP | Gap from prior level |
|---|---|---|
| 1 | 0 | — |
| 2 | 40 | 40 |
| 3 | 210 | 170 |
| 4 | 315 | 105 |
| 5 | 425 | 110 |
| 6 | 540 | 115 |
| 7 | 660 | 120 |
| 8 | 785 | 125 |
| 9 | 915 | 130 |
| 10 | 1,050 | 135 |
| 11 | 1,270 | 220 |
| 12 | 1,540 | 270 |
| 13 | 1,860 | 320 |
| 14 | 2,230 | 370 |
| 15 | 2,650 | 420 |
| 16 | 3,120 | 470 |
| 17 | 3,640 | 520 |
| 18 | 4,210 | 570 |
| 19 | 4,830 | 620 |
| 20 | 5,500 | 670 |

Levels 1–10 stay gentle (matches "a week of normal use" — no grinding
required); 11–20 is where the real difficulty lives, which is also where the
Legendary tier sits (see below) — the grind and the loot both show up in the
same half of the curve on purpose.

**The Level 1→2 gap (40 XP) is still the one intentional freebie** — same
as v1/v2, ~2 small tasks for a first-session dopamine hit.

**The multi-level-jump bug is still fixed**, but the margin is tighter than
v2 because the pacing targets forced smaller early gaps: every *pair* of
consecutive gaps still sums to more than 200 XP (one Epic task's full value),
which is the actual guarantee — a single Epic task, from any starting XP
total, can never advance a user by more than one level, anywhere in the
curve. Tightest point: Level 1 (0 XP) + one Epic task (200 XP) = 200 XP,
which is < Level 3's 210 — stops at Level 2, doesn't reach Level 3. That's
deliberately cut close to force the early game short; if you want more
headroom there, say so and I'll take a few XP from the L2→L3 gap's neighbors.

## Rarity bands

Four bands of exactly 5 levels each — a clean quarter of the curve per
rarity, and it happens to land the Common→Rare boundary right on the
daily-cap boundary (see below), which wasn't forced, just a good sign the
split is in the right place:

| Rarity | Levels | XP range | Reached by (normal / hard-grind) |
|---|---|---|---|
| Common | 1–5 | 0–425 | Day 0 / Day 0 |
| Rare | 6–10 | 540–1,050 | Day 3.6 / Day 1.2 |
| Epic | 11–15 | 1,270–2,650 | Day 8.5 / Day 2.8 |
| Legendary | 16–20 | 3,120–5,500 | Never in 14 days / Day 6.8–12 |

**Daily-cap boundary, still holds:** Level 5 (425 XP) is under the 500 XP
daily cap; Level 6 (540 XP) is over it. A participant who maxes the cap on
day one is locked out of Rare-tier content until day two — same property
`economy_system.md` required for the old second-animal-type gate, now an
emergent property of where Common ends rather than a single hand-placed gate.
This table effectively replaces the old abstract "second/third animal type"
single-gate language in `economy_system.md` with a real per-animal ladder —
see the Animals table below.

## Item catalog remapped from `Gatcha stuffs (1).pdf`

Same items, same costs, same rarities as the reference sheet — only the
**Level** column moves, spread across each rarity's 5-level band in ascending
cost order (cheapest-in-tier unlocks first). Every category advances through
all four bands at the same rate, so no category goes quiet for long stretches
while another one gets all the new content.

### Animals (22 items)

| Level | New unlocks |
|---|---|
| 1 | Koala (5) |
| 2 | Bunny (35) |
| 3 | Donkey (45) |
| 4 | Tortoise (55) |
| 5 | Otters (65), Dassie (75) |
| 6 | Giraffe (130), Zebra (150) |
| 7 | Monkey (170), Ostrich (190) |
| 8 | Flamingo (230), Axolotl (260) |
| 9 | Platypus (300) |
| 10 | Capybara (340) |
| 11 | Lion (480) |
| 12 | Fox (550) |
| 13 | Jaguar (620) |
| 14 | Tiger (1,000) |
| 15 | Penguin (1,200), Elephant (1,400) |
| 16–17 | — |
| 18 | Rhino (3,000) |
| 19–20 | — |
| 20 | Panda (3,500) |

*One animal at Level 1, as asked — the rest of the old six Level-1 commons
(Donkey, Otters, Dassie, Tortoise) now trickle out through Level 5.*

### Food (10 items)

| Level | New unlocks |
|---|---|
| 1 | Hay (30) |
| 2 | Seed (40) |
| 3 | Lettuce (45) |
| 4 | Branch (50) |
| 5 | — |
| 6 | Carrots (120) |
| 8 | Chicken (150) |
| 10 | Fish (220) |
| 11 | Bananas (420) |
| 13 | Steak (480) |
| 15 | Shrimp (950) |
| 16–20 | — (no Legendary food item exists in the reference sheet — gap, not a decision I made; flagging in case one should be added around Lv 18–20) |

*One food at Level 1, as asked.*

### Decor (16 items)

| Level | New unlocks |
|---|---|
| 1 | Hearts (30) |
| 2 | Stars (35) |
| 3 | Triangle (40) |
| 4 | Stripes (45) |
| 5 | Gradient (50), Water (55) |
| 6 | Pillow (110) |
| 7 | Carrots (130) |
| 8 | Fish (150) |
| 9 | Flowers (220) |
| 10 | Straw (250) |
| 11 | Savannah (450) |
| 13 | Trees (500) |
| 15 | Chicken legs (1,100) |
| 17 | Mona Lisa (3,200) |
| 19 | Starry night (3,400) |

### Accessories (19 items)

| Level | New unlocks |
|---|---|
| 1 | Plain tie (35) |
| 2 | Stripe tie (40), Bow tie (45) |
| 3 | Heart tie (50) |
| 4 | Stars tie (55) |
| 5 | Gingham tie (60), Collar (65) |
| 6 | Fedora hat (130), Reading glasses (150) |
| 7 | Running sunglasses (170) |
| 8 | Oversized sunglasses (190) |
| 9 | Baller hat (240) |
| 10 | Cowboy hat (280), Jester hat (320) |
| 11 | Top hat (480) |
| 12 | Pirate hat (550) |
| 14 | Aviators (1,000) |
| 15 | Flower crown (1,300) |
| 16 | Harry Potter glasses (2,800) |
| 20 | Crown (3,800) |

## Level 20 is the cap

No tail past Level 20. `LEVEL_THRESHOLDS` stays exactly the 20 entries in
the table above, `MAX_LEVEL` stays derived from the array length (as it
already works in the current `levels.ts`), and `isMaxLevel`/`levelProgress`
need no changes in shape — Level 20 is genuinely the ceiling, same as Level
10 was before this addendum. `ADDENDUM-levelup.md` and the style guide's
"Header — level cap" sample don't need to change what they assume, only the
number they assume it about.

## What's unchanged

Task-tier coin/XP rewards, item costs, the efficiency/streak/anti-spam
modifiers, and the 300-coin/500-XP daily cap. This addendum only moves XP
thresholds and item level requirements.

## Implementation record (2026-08-11)

- `src/lib/levels.ts` — `LEVEL_THRESHOLDS` replaced with the 20-entry table
  above. `MAX_LEVEL`/`isMaxLevel` needed no code changes, only the data —
  both are derived from the array.
- `prisma/seed.ts` — every catalogue item's `levelRequired` remapped
  (including Fox→12 and Penguin→15, per the resolved conflict above). `Cosy
  den` (no PDF match, no rarity) left untouched at Level 5. Doc comments
  updated to drop the retired Fox/Penguin exposure-timing narrative.
- `claude-memory/economy_system.md` — XP threshold table and store gate
  table replaced with the new curve and the 4-band rarity table, kept
  high-level with `prisma/seed.ts` as the source of truth for individual
  items, per Johan's call.
- `Requirements.md` §3.6–3.7 — fixed in the same pass (was still showing the
  original pre-2026-07-29 curve, stale across two rebalances).
- `src/lib/economy.test.ts` — every test asserting specific old-curve XP/
  level numbers updated to the new thresholds; the "crosses several levels
  in one completion" test rewritten to assert the opposite (the bug fix
  itself) instead.
- Not touched in this pass, not required for the fix to work: `Cosy den`'s
  missing rarity (pre-existing gap, unrelated to this ticket), and any UI
  copy that assumed a 10-level ceiling (the style guide's "Header — level
  cap" sample) — worth a look but doesn't affect correctness.
- GitHub issue #160 has not been closed/commented on — that's a call for
  Johan to make, not something done automatically here.

## Resolved / no longer open

Was the Level-1→3 margin (one Epic task stops 10 XP short of Level 3) too
tight? Not flagged as a concern when the rest of the curve was approved —
shipped as designed.
