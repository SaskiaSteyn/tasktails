# TaskTails — Handoff Addendum: Leaderboard + Profile rank button

Supplements the main handoff (`design_handoff_tasktails/README.md`) — same tokens, fonts, and palette. Lives in `TaskTails Screens.dc.html` (Profile & settings group).

## Purpose
Social ranking. The Profile carries a **rank button** summarising where the user stands; tapping it opens the full **Leaderboard**.

## Flow
`Profile → (tap rank button) → Leaderboard → (back chevron) → Profile`

## Rank button (on Profile screen)
Sits between the LIFETIME stats grid and the Buy-XP card.
- Card: background `#FCEBD3`, border `#F0DCB8`, radius 14, padding `11px 13px`, flex row, 11px gap, `margin-bottom:14px`.
- Left: 38×38 rounded-11 tile `#E5A93C` with a white 20px Lucide **trophy** icon.
- Middle: "Your rank this week" (800, 12.5px, `#8A6416`) + subline "Top 8% · climbing 3 spots" (700, 11px, `#B08A3C`).
- Right: rank number "#12" (Fredoka 600, 22px, `#B67F1E`) + a 17px chevron-right (`#B08A3C`).
- Whole card is the tap target → Leaderboard.

## Leaderboard screen (mobile, 300×640)
- **Status bar:** standard 36px.
- **Header:** back chevron "‹" (22px, `#8A8178`) + "Leaderboard" (Fredoka 600, 19px). No background fill; `#EFE7DA` bottom border only. Back → Profile.
- **Period tabs:** one flex row, 6px gap, padding `12px 16px 0`. Three segments, each flex:1, 32px tall, radius 9, 800/12px. Active = `#E27A54` on white text; inactive = `#8A8178` on `#F2EEE7`. Tabs: **This week** (active) · **This month** · **All time**. (No Friends tab — friend-adding isn't in scope.)
- **Podium (top 3):** centered flex row, `align-items:flex-end`, 10px gap, padding `14px 16px 10px`. Order 2 / 1 / 3 left-to-right.
  - 1st: 18px gold star above; 48×48 circular avatar (`#FCEBD3` fill, `#E5A93C` 2.5px border); name; pedestal 56×52, radius `10px 10px 0 0`, `#F2C879`, holding rank "1" (Fredoka 20px `#8A6416`) + score.
  - 2nd: 40×40 avatar (`#E7EEF6`/`#B9C6D6`); pedestal 52×38 `#D6DEE8`, text `#7C8A9C`.
  - 3rd: 40×40 avatar (`#F6EDE7`/`#D8B79E`); pedestal 52×30 `#E4C9B4`, text `#B07B57`.
  - Avatars use monogram initials as placeholders (real app: user photos).
- **Ranked list:** `flex:1`, `overflow:hidden`, background `#FBF9F4`, padding `4px 14px 8px`, 5px gap. Each row = white card, border `#EFE7DA`, radius 12, padding `8px 12px`, flex row 11px gap: rank number (Fredoka 14px `#8A8178`, 20px wide) · 30×30 monogram avatar · name (800/12.5px) · score (800/12px `#8A8178`). Shows ranks 4–5, then a centered ellipsis "···" (`#C6BCAF`) to skip the gap.
- **Current-user row (pinned):** same layout, highlighted — background `#FBEAE3`, border 1.5px `#E27A54`, all text `#C23B2E`. Uses the shared `<image-slot id="lb-avatar">` for the user photo. Rank "12", name "You (Nico)", score "1,180".
- **Bottom nav:** shared floating round-button nav (check / store / center "+" / paw / profile). Profile is the active tab (this screen is reached from Profile).

### Sample data
| Rank | Name | Score |
|------|------|-------|
| 1 | Kai | 3,540 |
| 2 | Aria | 3,120 |
| 3 | Mila | 2,880 |
| 4 | Theo | 2,640 |
| 5 | Sana | 2,410 |
| … | | |
| 12 | You (Nico) | 1,180 |

## Behavior / state notes
- Score metric = coins (or XP) earned in the selected period; switching tabs re-queries and re-ranks. Keep the rank-button subline ("this week", percentile, movement) in sync with the **This week** tab.
- The current-user row is always pinned/visible even when far down the list; the ellipsis collapses the ranks between the visible leaders and the user.
- "climbing 3 spots" / movement indicator is derived from the previous period's rank — optional but drives the button's motivational copy.
- Vertical budget is tight on 300×640: podium + tabs + list + pinned row must fit above the bottom nav with the You row fully visible. If more ranked rows are added, keep the list scrollable rather than growing the frame.
