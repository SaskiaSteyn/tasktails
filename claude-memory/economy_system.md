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

## XP Level Thresholds (hockey-stick curve)
Levels 1–5 arrive in first session (~3–6 tasks) for immediate dopamine hit; curve steepens for 6–10.

| Level | XP Required |
|-------|------------|
| 1 | 0 |
| 2 | 8 |
| 3 | 20 |
| 4 | 35 |
| 5 | 55 |
| 6 | 200 |
| 7 | 500 |
| 8 | 900 |
| 9 | 1,400 |
| 10 | 2,000 |

Average user (~5 tasks/day) reaches Level 10 by day 13–14. Low performers reach Level 7–8.

## Store Level Gates & Coin Prices

| Level | Items | Price range |
|-------|-------|------------|
| 1 | Basic food, simple accessories | 30–80 coins |
| 3 | Standard treats, medium accessories | 100–200 coins |
| 5 | Themed accessories, habitat decorations | 200–350 coins |
| 7 | Rare accessories, second animal type | 400–700 coins |
| 10 | Legendary items, third animal type | 900–1,500 coins |

**Why:** These numbers were agreed by the user and designed so average users earn ~1,500 coins over 14 days with meaningful but not unlimited purchasing power. Second animal type gates at Level 7 (day 3–4), ensuring all false urgency tiers are exposed during the 2-week study.

**How to apply:** These are the authoritative numbers for implementation. Any changes need to be reflected in `Planning/Requirements.md`.
