# TaskTails — Handoff Addendum: Level-up Success Screen

Supplements the main handoff (`design_handoff_tasktails/README.md`) — same tokens, fonts, and palette. Lives in `TaskTails Screens.dc.html` (Shared group).

## Purpose
Full-screen celebration shown when the user crosses a level threshold (XP fills to the next level). Momentary reward moment; dismisses to wherever the user was (dashboard/zoo).

## Layout (mobile, full-bleed 300×640)
- **Background:** solid terracotta `#E27A54` (full-bleed, edge to edge — not a card on a scrim).
- **Confetti:** scattered small decorative shapes (7–9px squares rotated ~12–40° and circles) in amber `#F2C879`, violet `#8478C4`, sage `#5FA97E`, cream `#FBDACB`. Purely decorative, absolutely positioned in the upper half. (In production, animate these falling on mount.)
- **Overline:** "LEVEL UP!" — Nunito 800, 12px, letter-spacing 2px, `#FBE3D8`.
- **Medallion** (centered, 150px):
  - Outer ring: circle, `rgba(255,255,255,.16)`.
  - Inner disc: white circle (inset 14px), shadow `0 10px 24px rgba(46,42,38,.2)`, containing "LEVEL" (800, 11px, `#8A8178`) over the new level number (Fredoka 600, 52px, `#E27A54`).
- **Title:** "You reached Level 5!" — Fredoka 600, 26px, white.
- **Subtitle:** encouraging line, `#FBE3D8`, 13.5px.
- **Reward tiles** (row, gap 10, full width): translucent `rgba(255,255,255,.16)` cards, radius 14. Each = white 30px icon chip + value (Fredoka 600, 16px, white) + label (10px 700 `#FBE3D8`). Examples: "+150 bonus coins" (amber coin chip), "Star hat — new accessory" (violet diamond chip). Render one tile per reward earned; hide the row if none.
- **Primary action:** full-width white button, `#E27A54` text, Fredoka 600, height 50, radius 13, shadow `0 6px 14px rgba(46,42,38,.18)` — "Claim rewards".
- **Tertiary link** beneath: "Keep going" — `#FBE3D8` 700, dismisses without the rewards drawer.

## Behavior / state
- Trigger: `xp >= xpToNextLevel` → increment level, compute rewards, show screen.
- Props: `newLevel` (int), `rewards[]` ({icon, value, label}).
- "Claim rewards" credits the payout (coins/accessory) then closes; "Keep going" closes immediately (rewards still auto-credited server-side).
- On mount: play confetti + a light haptic/sound (respect the Settings "Sound effects" / "Reduce motion" toggles).

## Notes
- No pet artwork on this frame (kept clean — the medallion is the focus).
- Reuses the standard primary/secondary button and coin/accessory icon chips from the design system.
