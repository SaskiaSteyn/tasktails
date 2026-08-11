---
name: economy-system
description: "Coins/XP economy rules, level thresholds, store gates, and anti-spam guardrails for IMY761 gamified todo app"
metadata: 
  node_type: memory
  type: project
  originSessionId: 18f572f9-1aa5-4b4e-9d99-b8664e670184
---

## Economy Overview
- **Coins**: earned by completing tasks; spent in the store
- **XP**: earned by completing tasks; gates store items by level
- **XP buyable**: 100 coins → 40 XP

## Task Complexity → Rewards

| Tier | Label | Coins | XP |
|------|-------|-------|----|
| 1 | Trivial (< 15 min) | 5 | 8 |
| 2 | Small (15–30 min) | 15 | 20 |
| 3 | Medium (1–2 hrs) | 35 | 45 |
| 4 | Large (3–6 hrs) | 75 | 100 |
| 5 | Epic (full day+) | 150 | 200 |

## Modifiers
- **Early completion**: +25% coins (XP unaffected)
- **1 day late**: −10 coins; additional days −10/day more; floor: 0 coins
- **Streak bonuses (coins only)**: 3-day +10%, 7-day +20%, 14-day +35%
- **Anti-spam**: same task title within 24 h → 50% reward; 48 h → 25%; 72 h → 10%; min 1 coin, 1 XP
- **Daily cap**: 300 coins and 500 XP max per day

## Subtasks
- Proportional share of parent's coins+XP on individual subtask completion
- Parent earns 0 extra when all subtasks done

## XP Level Thresholds (hockey-stick curve, 20 levels)

| Level | XP Required | | Level | XP Required |
|-------|------------|---|-------|------------|
| 1 | 0 | | 11 | 1,270 |
| 2 | 40 | | 12 | 1,540 |
| 3 | 210 | | 13 | 1,860 |
| 4 | 315 | | 14 | 2,230 |
| 5 | 425 | | 15 | 2,650 |
| 6 | 540 | | 16 | 3,120 |
| 7 | 660 | | 17 | 3,640 |
| 8 | 785 | | 18 | 4,210 |
| 9 | 915 | | 19 | 4,830 |
| 10 | 1,050 | | 20 | 5,500 (hard cap) |

Level 2 still arrives after ~2 small tasks for the early dopamine hit. Every
pair of consecutive gaps from there on sums to more than 200 XP (one Epic
task's full value), so a single completion — even the largest task in the
game — can never clear more than one level.

Two pacing anchors, not just "steepens toward the end": Level 10 is reached
in exactly 7 days of *normal* use (~150 XP/day, the average assumption
below). Level 20 is reached in exactly 12 days only by *hard grinding*
(~460 XP/day, ~92% of the daily cap, sustained every day) — a normal-pace
user is only around Level 12–13 by the end of the 14-day study. There is no
level past 20.

**Rebalanced 2026-08-11 (issue #160 — "too easy to gain xp and level up").**
The 2026-07-29 rebalance fixed the same-sitting jump for small tasks but
still let a single Epic task (200 XP) clear three thresholds from a fresh
account. This rebalance doubles the cap from 10 to 20 levels and fixes the
jump structurally rather than just for the first few levels — see
`design_handoff/ADDENDUM-xp-curve.md` for the full derivation, the worked
example, and the item catalogue remap that came with it.

Level 5 (425) is under the 500 XP daily cap and Level 6 (540) is over it, so
a participant who maxes the cap on day one lands on Level 5 and cannot reach
Level 6 — now the boundary between the Common and Rare item-rarity bands in
the catalogue, not a single named gate — until day two. Keep Level 5 under
500 and Level 6 over it or that guarantee is lost.

## Store Item Rarity Bands & Catalogue

The old single "gate level per tier" table is retired — the full ~69-item
catalogue (animals/food/decorations/accessories) is spread individually
across the curve, cheapest-first within each rarity's band. `prisma/seed.ts`
is the source of truth for every item's exact `levelRequired`; this table is
just the shape:

| Rarity | Levels | XP range |
|--------|--------|----------|
| Common | 1–5 | 0–425 |
| Rare | 6–10 | 540–1,050 |
| Epic | 11–15 | 1,270–2,650 |
| Legendary | 16–20 | 3,120–5,500 |

The Common/Rare boundary lands on the daily-cap boundary above by
construction, not by coincidence — see `ADDENDUM-xp-curve.md`.

The old "second/third animal type" story pinned to Level 7/10 specifically
is retired: all 22 animals are now spread through the curve like every other
category, no longer special-cased by name.

**Why:** Rebalance agreed by the user (2026-08-11) to fix XP progression
feeling too easy, and to give every rarity tier real content spread across
the curve instead of bunching at five checkpoint levels.

**How to apply:** These are the authoritative numbers for implementation.
`src/lib/levels.ts`, `prisma/seed.ts`, and `Planning/Requirements.md` all
carry a copy and must agree.
