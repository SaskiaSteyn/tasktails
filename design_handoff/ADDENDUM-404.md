# TaskTails — Handoff Addendum: 404 Not Found Screen

Supplements the main handoff (`design_handoff_tasktails/README.md`) — same tokens, fonts, and palette. Lives in `TaskTails Screens.dc.html` (Shared / states group).

## Purpose
Shown when a route/resource can't be found. Full-screen, friendly, one clear way back.

## Layout (mobile, full-bleed 300×640)
- **Background:** white `#FFFFFF`. Standard 36px status bar at top.
- **Body:** vertically + horizontally centered, padding 26px, text centered.
- **Numeral:** "404" — Fredoka 600, 96px, terracotta `#E27A54`, line-height 1.
- **Title:** "This page wandered off" — Fredoka 600, 23px, ink `#2E2A26`.
- **Body copy:** "The page you are looking for doesn't exist, let's go back home." — Nunito 400, 14px, `#8A8178`, line-height 1.5, max-width ~230px.
- **Primary button:** "Back to tasks" — `#E27A54`, white, Fredoka 600, 16px, height 48, radius 13, padding 0 28px, shadow `0 6px 14px rgba(226,122,84,.35)`. Routes to the dashboard (or marketing home if logged out).

## Behavior / state
- Stateless. Single primary action → home route.
- No pet artwork (kept clean).
- On the web/marketing surface, mirror the same copy + button in the site's own layout/chrome.
