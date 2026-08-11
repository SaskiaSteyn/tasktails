# TaskTails — Handoff Addendum: Zoo Gallery + Sanctuary header

Supplements the main handoff (`design_handoff_tasktails/README.md`) — same tokens, fonts, and palette. Lives in `TaskTails Screens.dc.html` (Petting zoo group, screen 4).

## Purpose
Entry point reached by tapping the **Zoo** button in the bottom nav. Shows an at-a-glance gallery of every pet the user owns with their happiness + hunger, so they can spot who needs attention before drilling in. Tapping a pet opens its **Sanctuary** (the interactive pet/feed screen — no separate "overview" screen; that was cut).

## Flow
`Zoo nav button → Zoo gallery → (tap a pet) → Sanctuary`

## Zoo gallery (mobile, 300×640)
- **Status bar:** standard 36px.
- **Header:** no coin pill. Left: "Your zoo" (Fredoka 600, 19px) with subtitle "{n} friends · tap to visit" (11px, `#A89E92`). Background `#FBF6EF`, bottom border `#EFE7DA`, padding 8px 18px 12px.
- **Body:** background `#FBF9F4`, padding 14px. Two-column CSS grid, 12px gap.
- **Pet card** (repeat per owned pet):
  - White card, radius 18, border `#EFE7DA`, padding `12px 11px 11px`, shadow `0 6px 14px rgba(46,42,38,.05)`. A pet whose stats are low uses border `#F4D9C9` to draw the eye.
  - **Art tile:** full-width, height 78, radius 13, soft gradient tuned per species (fox `#EAF3EC→#F3ECE1`, penguin `#E7EEF6→#F1ECF3`, koala `#F3ECE1→#F6EDE7`). Animal SVG ~60–62px centered.
  - **Mood tag:** absolute top-right pill, 9px 800. Good moods green (`#5FA97E` on `#E7F0E9`); needs-attention terracotta (`#C9633F` on `#FBE3D8`).
  - **Name:** Fredoka 600, 14px. **Meta:** "{Species} · Lvl {n}" 10px `#A89E92`.
  - **Two stat rows** (happiness, then hunger), 6px gap: a 11px Lucide icon (heart / utensils-crossed) + a 6px-tall track (`#EFE7DA`) with a rounded fill.
    - **Colour rule:** the icon stroke ALWAYS matches its own bar fill. Healthy = green `#5FA97E`; caution = amber `#E5A93C`; critical = terracotta `#E27A54`. Fill width = the stat percentage.
- **Adopt slot:** last grid cell, dashed border `#D8CEC0`, radius 18, min-height 170. Centered circular "+" and "Adopt another" label. Routes to store / adoption.
- **Bottom nav:** the shared floating round-button nav (check / store / center "+" / paw / profile). Zoo (paw) is the active tab.

### Sample data shown
| Pet | Species · Lvl | Mood | Happiness | Hunger |
|-----|---------------|------|-----------|--------|
| Mochi | Fox · 5 | Content (green) | 82% green | 76% green |
| Waddles | Penguin · 7 | Happy (green) | 91% green | 88% green |
| Kobi | Koala · 3 | Peckish (terracotta) | 58% amber | 34% terracotta |

## Sanctuary header change
The Sanctuary screen (interactive pet/feed) header was updated:
- Title now shows the **pet's name** ("Mochi"), not the word "Sanctuary".
- **Coin pill removed** from this header.
- **No background fill** on the header bar (kept the `#EFE7DA` bottom border only).
- A **back chevron** ("‹", 22px, `#8A8178`) sits in front of the pet name — back navigates to the Zoo gallery.

## Behavior / state notes
- Gallery is data-driven: one card per owned pet, plus the trailing adopt slot. Empty state (no pets) should surface the adopt slot prominently.
- Happiness/hunger values, mood label, and the derived colour band come from the same pet-state model the Sanctuary uses — keep them in sync so the gallery mini-bars and the Sanctuary bars never disagree.
- "Needs attention" styling (terracotta card border + mood pill) triggers when any stat falls into the caution/critical band.
