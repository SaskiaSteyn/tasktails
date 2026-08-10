# TaskTails — Handoff Addendum: Achievements page

Supplements the main handoff (`design_handoff_tasktails/README.md`) — same tokens, fonts, and palette. Lives in `TaskTails Screens.dc.html` (Profile & settings group).

## Purpose
Let users see every achievement — unlocked and locked — with a description of how to unlock each, so they know what to work toward. Replaces the "4 blocks, no detail" strip on the Profile as the full view.

## Flow
`Profile → (tap "See all ›" in the ACHIEVEMENTS header) → Achievements → (back chevron) → Profile`

## Profile change
The ACHIEVEMENTS section header on the Profile is now a flex row: label "ACHIEVEMENTS" (800/11px `#8A8178`) on the left, and a **"See all ›"** link on the right (800/11px `#E27A54` + 13px chevron-right). The 4-badge preview strip below it is unchanged; the link opens the full Achievements page.

## Achievements screen (mobile, 300×640)
- **Status bar:** standard 36px.
- **Header:** back chevron "‹" (22px `#8A8178`) + "Achievements" (Fredoka 600, 19px) + right-aligned progress pill **"3 / 8"** (800/11px `#5FA97E` on `#E7F0E9`, radius 20). No background fill; `#EFE7DA` bottom border only. Back → Profile. The pill count = unlocked / total.
- **Category tabs:** one horizontally scrollable row (`overflow-x:auto`), 7px gap, padding `11px 14px 0`. Pills are 28px tall, radius 20, padding `0 13px`, 800/11.5px. Active = `#E27A54` on white text; inactive = `#8A8178` on `#F2EEE7`. Tabs in order: **All** (active) · **Streaks** · **Tasks** · **Petting Zoo** · **Items**. Selecting a tab filters the list to that category; "All" shows everything.
- **List:** `flex:1`, **`overflow-y:auto`** (scrolls — all 8 rows exceed the frame by design), background `#FBF9F4`, padding `11px 14px`, 8px gap. No bottom nav on this screen (it's a drill-in from Profile; back chevron returns).

### Achievement row
- **Unlocked:** white card, border `#EFE7DA`, radius 13, padding `10px 12px`, flex row 11px gap. Left = 40×40 rounded-12 icon tile in the badge's colour family (green `#E7F0E9`/`#D6E7DC`, amber `#FCEBD3`/`#F0DCB8`, purple `#F3EFFA`/`#E4DBF2`) holding the badge motif (circle / triangle / rotated square — reused from the Profile preview strip). Middle = name (Fredoka 600, 13.5px) + unlock description (10.5px `#8A8178`). Right = green check (18px `#5FA97E`).
- **Locked:** muted card, background `#F7F3EC`, border `#ECE4D7`. Icon tile is `#F2EEE7` with a dashed `#D8CEC0` border and a grey padlock (Lucide `lock`). Name + description in `#A89E92`. No check.
- **Locked with progress:** same as locked, plus a progress row under the description — 5px track (`#EFE7DA`) with a grey fill (`#C6BCAF`) + "41/100"-style count (9px 800 `#A89E92`).

### Achievement set (current sample)
| Achievement | Category | State | Unlock description |
|-------------|----------|-------|--------------------|
| First steps | Tasks | Unlocked | Complete your first task |
| On a roll | Streaks | Unlocked | Keep a 5-day task streak |
| Collector | Petting Zoo | Unlocked | Adopt 2 animals |
| Centurion | Tasks | Locked (41/100) | Complete 100 tasks |
| Big spender | Items | Locked | Spend 1,000 coins in the store |
| Perfect week | Streaks | Locked | Finish every task 7 days straight |
| Best friend | Petting Zoo | Locked | Max out a pet's happiness |
| Top of the class | — (leaderboard) | Locked | Reach #1 on the weekly leaderboard |

## Behavior / state notes
- Each achievement belongs to one category; the tab filter narrows the list, "All" shows the full set. (Category assignments above are the design intent — map each achievement to Streaks / Tasks / Petting Zoo / Items; "Top of the class" is leaderboard-driven — file under Tasks or a future category as the team prefers.)
- The "3 / 8" pill and the Profile preview strip both derive from the same unlocked-achievement data — keep in sync.
- Unlock descriptions are the achievement's criteria copy; where a numeric threshold exists (tasks, coins, streak days), show a progress bar with current/target while locked, and swap to the coloured badge + green check on unlock.
- Locked achievements always remain visible (greyed) so users can see what to aim for — do not hide them.
