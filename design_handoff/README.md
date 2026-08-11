# Handoff: TaskTails — Gamified Todo & Pet Sanctuary (IMY761)

## Overview
TaskTails is a mobile-first gamified todo app that doubles as a research instrument for the IMY761 study on false-urgency dark patterns. Users complete tasks to earn **coins** and **XP**, level up, keep a **streak**, and spend rewards in a **store** to feed/pet/customise animals in a **petting-zoo sanctuary**. Every user is randomly assigned to **Group A (neutral store)** or **Group B (store with fabricated urgency stimuli)**; researchers view aggregate + per-user telemetry through an admin dashboard.

Covers: marketing site, landing/welcome, auth (register, login, onboarding), task dashboard/detail/create, inline date picker, store (A vs B + cart, history), sanctuary + customize, profile + settings, admin dashboards, a persistent header + bottom nav, and empty/error/locked states.

## About the Design Files
The files here are **design references authored in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**. They use a small streaming runtime (`support.js`) plus helper web components (`image-slot.js`, `doc-page.js`) that are **not part of your app** — ignore them.

Recreate these designs in the target codebase's environment (React, Vue, SwiftUI, native, Flutter, etc.) using its established component patterns, styling, and libraries. If no environment exists yet, pick an appropriate mobile-first stack. Do not ship the HTML directly.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, iconography, and key interactions are specified below and are pixel-accurate in the mocks. Two screens are live in the mock (task completion updates coins/XP; pet/feed updates happiness/hunger; Group B urgency timers tick) — treat these as intended real behavior.

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| Board / app background | `#F1E9DC` | outermost canvas |
| Warm surface | `#FBF6EF` | headers, cards, section fills |
| Surface / card | `#FFFFFF` | screens, primary cards |
| Input fill | `#F6F1E9` | text fields, inputs |
| Ink (text) | `#2E2A26` | primary text, footer bg |
| Ink soft | `#8A8178` | secondary text, labels |
| Ink faint | `#B8AFA4` | placeholder, disabled text |
| Border / track | `#EFE7DA` | borders, progress tracks |
| Border (input) | `#EBE2D5` | input borders |
| **Terracotta (primary)** | `#E27A54` | primary buttons, active states, brand |
| Terracotta hover / pressed | `#C9633F` / `#B85838` | button hover / active |
| Terracotta tint | `#FBEAE3` | streak pill, badge bg |
| **Sage (success)** | `#5FA97E` | checkboxes, happiness, positive btn |
| Sage tint / text | `#E7F0E9` / `#3F8C63` | success bg / text |
| **Amber (coins)** | `#E5A93C` | coin icon, hunger bar |
| Amber ring / tint / text | `#F2C879` / `#FCEBD3` / `#B67F1E` | coin ring / bg / value text |
| **Violet (XP/level)** | `#8478C4` | XP bar, level disc, AI insight |
| Violet tint / text | `#EEE9F5` / `#5C5470` | bg / text |
| **Urgency red (GROUP B ONLY)** | `#DB4C3F` | countdowns, "Only 3 left!", destructive |
| Urgency tint / text | `#FDE7E3` / `#C23B2E` | bg / text |

> **Rule:** Urgency red is reserved **exclusively** for Group B false-urgency elements and destructive (delete/log-out) actions. Group A and neutral UI must never use it.

### Task complexity ramp (tier color · coins/XP)
Trivial `#98A2AE` 5/8 · Small `#5FA97E` 15/20 · Medium `#E5A93C` 35/45 · Large `#E27A54` 75/100 · Epic `#8478C4` 150/200.

### Typography
- **Display / headings / numerals:** **Fredoka** 400/500/600 (600 default). Google Fonts.
- **Body / UI / labels:** **Nunito** 400/600/700/800. Google Fonts.
- Scale: page/brand title Fredoka 600 32–34 · section Fredoka 600 22–24 · screen/card title Fredoka 600 17–19 · stat/numeral Fredoka 600 17–22 · body/task title Nunito 700 13–14 · secondary Nunito 400 12–13 `#8A8178` · label/overline Nunito 800 10–12 UPPERCASE +0.4px `#8A8178`.

### Spacing / Radius / Shadow
- Spacing 4-based; common gaps 6·8·10·14·16; screen padding 16–24. **flex/grid + `gap`**, not per-element margins.
- Radius: chip 8 · input 12 · card 14–18 · pill 20 (or 50%) · phone frame 34.
- Shadow: card `0 16px 34px rgba(46,42,38,.10)` · button (tinted) `0 6px 14px rgba(226,122,84,.35)` · floating nav idle `0 4px 12px rgba(46,42,38,.10)` / active `0 6px 14px rgba(226,122,84,.4)`.

### Iconography
Flat **Lucide** icons (`lucide.dev`), stroke ~2–2.2, `currentColor`. Add the `lucide` package. Used: lock, flame, trash-2, sparkle, zap, heart, utensils, paw-print, alert-triangle, check-square, shopping-bag, user, plus, search, history, calendar, chevron-left/right/down. **No emoji anywhere.** Coins render as a filled amber circle with a lighter ring.

## Components (shared)

### Persistent header
Warm `#FBF6EF` bar, bottom border `#EFE7DA`. Left: greeting + name. Right cluster (flex gap 8): **coin pill** (white, `#EFE7DA` border, radius 20; amber circle+ring + value `#B67F1E` 800), **level disc** (34px violet circle "Lv4"), and on some screens a **streak pill** (`#FBEAE3`, flame + count `#E27A54`). Dashboard also shows the XP bar + streak stat card. Coins/level/streak appear on every logged-in screen.

### Bottom nav (Uber-Eats style)
Row of **floating round buttons**, `justify-content:center; gap:14px`, white bg, no top border, `flex:none` on each so they stay circular. Four **42px** tab circles — Tasks (check-square), Store (shopping-bag), Zoo (paw-print), Profile (user) — plus a **raised 46px terracotta "+" add-task button in the middle**, reachable from every screen (it replaces the old floating FAB). Active tab = filled `#E27A54`, white icon; idle = white, 1px `#EFE7DA` border, `#8A8178` icon, drop shadow.

### Buttons
- **Primary:** `#E27A54`, white, Fredoka 600, radius 12–13, height 44 (inline) / 48 (full), tinted shadow. Hover `#C9633F` +lift 1px; pressed `#B85838` +sink 1px; disabled 40% tint, no shadow. 120ms ease.
- **Positive:** same as primary but `#5FA97E`.
- **Secondary:** **white fill, 1.5px `#E27A54` stroke + terracotta text**; hover bg `#FBEAE3` / border `#C9633F`. (Not a grey fill.)
- **Icon (destructive):** white, 1px `#EBD9D2` border, red trash icon.
- **Add-task button:** lives in the nav (see above), not a floating FAB.

### Inputs
Fill `#F6F1E9`, 1px `#EBE2D5`, radius 12, height 44; uppercase label above. **Focused:** white fill, 2px `#E27A54` border, 4px focus ring `rgba(226,122,84,.16)`, caret + terracotta label. **Error:** 2px `#DB4C3F` border, ring `rgba(219,76,63,.14)`, red message. Placeholder `#B8AFA4`.

### Date picker (inline popover)
**Not a modal.** The Due-date field is a trigger (active = 2px terracotta border, calendar + chevron, radius 12 on top only); the calendar panel **attaches directly beneath it** (shared terracotta border, seamless join, radius on bottom only, drop shadow). Contains: quick chips (Today / Tomorrow / Weekend), month nav (‹ July 2026 ›), weekday header, and a 7-col month grid of **square** day cells. Today = terracotta ring; selected day = filled terracotta circle. Keep cells square so the selection is a perfect circle.

### Cards & rows
- **Task row:** `#FBF6EF`, 1px `#EFE7DA`, radius 14. 22px checkbox circle (idle 2px `#D8CEC0` → done: sage fill + white check). Title 700 13.5 (done = strikethrough `#B8AFA4`) + tier tag (10px/800, color @13% alpha bg, radius 6) + due text. Coin reward on the right. Tap toggles.
- **Store item card:** `#FBF6EF`, radius 15. Accent-tinted icon well, name, category, price (amber + `#B67F1E`) + "+" add button. Locked variant: desaturated `#F2EEE7`, lock icon, "Unlocks at Lvl N" chip.
- **Progress bars:** track `#EFE7DA`, height 8, radius 5. Fill semantic — XP violet, happiness sage, hunger amber.
- **Toggle:** 40×23 pill; ON = sage, knob right; OFF = `#D8CEC0`, knob left.

## Screens / Views
Phone frames are **300×640** with a 36px status bar. Board groups: Auth, Task dashboard, Store, Petting zoo, Profile & settings, Admin, Shared/states, Marketing.

### Auth
1. **Marketing site** (desktop, in browser frame ~1180px) — nav (logo + Features/How it works/The zoo/Log in + "Get started free"), hero (light fox badge, "Do your tasks. Raise a zoo of little friends.", CTAs, avatar stack + social proof, hero phone showing the sanctuary), 3-col feature grid, "Three steps" how-it-works, CTA, dark footer. Same palette/fonts/logo.
2. **Landing / welcome** — full terracotta screen, centered light fox badge (`assets/icon-light.svg`), "Do tasks. Raise pets.", three translucent feature chips, white "Get started" + "Log in" link.
3. **Register** — fox badge (`assets/icon.svg`), Email / Password / Confirm fields, "Create account", divider, **single full-width "Continue with Google"** OAuth button (Apple was removed), study-group consent note, link to Login.
4. **Login** — "Welcome back", Email / Password + "Forgot password?", "Log in", divider, full-width "Continue with Google", link to Register.
5. **Onboarding** — "WELCOME, NICO", "Your first three quests", progress ring + three goal cards (Complete 3 tasks 1/3, Buy 1 animal 0/1, Feed 3 animals 0/3), "Let's go".

### Task dashboard
6. **Dashboard** — persistent header (coins, level, XP bar, streak). "TODAY" task rows. Bottom nav with central + add button, Tasks active. **Interactive:** tap a row → toggle done, adjust coins/XP live.
7. **Task detail / edit** — TITLE, DUE DATE, COMPLEXITY (5 tier chips, selected = solid tier color), SUBTASKS (check + label + coin value, + Add), footer "Reward 75 coins · 100 XP", delete + "Save changes".
8. **Create task (bottom sheet)** — scrim over dimmed dashboard, grab handle, title input, "HOW BIG?" 5 tier chips with coin values, DUE field, "Add task".
9. **Date picker (inline popover)** — the create-task sheet with the calendar expanded under the Due field (see Date picker component).

### Store
10. **Store — Group A (control)** — header (title + **history icon** + coin pill), search field, category chips (All active), 2-col grid of neutral cards incl. one **locked** ("Fox kit — Unlocks at Lvl 7"). No urgency. Store active in nav.
11. **Store — Group B (urgency)** — same catalogue/layout/prices/search **plus fabricated urgency stimuli**, each pinned with a numbered dot mapping to the legend. The 7 patterns:
    1. Countdown timer — red flash-sale banner with live MM:SS.
    2. Stock depletion — "Only 3 left!".
    3. Cart activity — "5 in carts".
    4. Recent purchases — "8 sold in the last hour".
    5. Urgency language — "Last chance — don't miss out!".
    6. Bundle timer — "Buy 2 get 1 · MM:SS".
    7. Currency urgency — "Double XP this hour only".
    Group assignment is **server-enforced and permanent**; A never sees these. All values fabricated. (The board also shows an annotation legend card — a spec artifact, not a screen.)
12. **Cart / checkout** — item rows with qty steppers, summary (subtotal / balance now / balance after), "Check out · 145".
13. **Purchase history** — reached via the **history icon in the store header**. Entries grouped TODAY / YESTERDAY (thumb, name×qty, time, −cost), footer "Spent this week 575 coins".

### Petting zoo
14. **Sanctuary** — gradient stage, pet name "Mochi", mood label (color by happiness: ≥70 Happy / 40–69 Content / <40 Needs love), fox artwork (`assets/animals/fox.svg`), HAPPINESS (sage) + HUNGER (amber) bars, actions **Pet** (terracotta) / **Feed** (sage) / sparkle customize. Zoo active. **Interactive:** Pet +7 happiness; Feed −18 hunger +4 happiness; face + bars react.
15. **Customize & collection** — preview with fox + sage collar, "YOUR ACCESSORIES" grid (owned = sage border, locked = dashed "Lvl N"), "OTHER ANIMALS" row (owned koala `assets/animals/koala.svg` + locked "Lvl 7").

### Profile & settings
16. **Profile** — header with **user-uploadable circular avatar** (image drop; default is an upload placeholder), name, email, badges "LEVEL 4" + "STUDY GROUP B". "LIFETIME" 2×2 stats, violet "Buy XP with coins" card (100→40, "Convert"), "ACHIEVEMENTS" badges. Profile active.
17. **Settings** — grouped list cards: ACCOUNT (Email, Change password), NOTIFICATIONS (Daily reminder ON, Streak alert ON), PREFERENCES (Sound OFF, Reduce motion OFF), violet research-consent note, destructive "Log out".

### Admin (desktop cards)
18. **Admin overview** (520px) — "Study overview" + Live badge, 4 KPI tiles, "GROUP A vs GROUP B" comparison bars (A sage, B red): store visits 8.4 vs 13.1, conversion 31% vs 54%, trust 5.3 vs 3.7, violet AI-insight callout.
19. **Per-user telemetry** (420px) — participant header + GROUP B badge, 2×2 stats, STORE FUNNEL bars (Viewed 57 → Added 32 → Purchased 19), 14-day RETURN PATTERN bar chart.

### Shared / states
20. **Persistent header** & **bottom nav** spec (see Components).
21. **Empty tasks** — dashed square, "All clear!", "+ New task".
22. **Empty cart** — bag outline, "Cart's empty", secondary "Go to store".
23. **Locked by level** — violet lock, "Locked — Level 7", progress (57%, "Level 4 · 3 to go").
24. **Error / offline** — "Can't reach TaskTails", "You're offline…", "Retry".

## Interactions & Behavior
- **Task completion:** tap → toggle; on complete add tier coins+XP, strike title, fill checkbox; reverse on un-complete (clamp at 0).
- **Pet:** happiness +7 (max 100). **Feed:** hunger −18 (min 0) + happiness +4. Mood label/color from thresholds (≥70 / 40–69 / <40).
- **Group B timers:** flash-sale + bundle countdowns tick every 1s (MM:SS), loop at 0. Fabricated stimuli.
- **Buttons:** hover darken+lift, press darken+sink, 120ms. **Inputs:** focus ring + terracotta border; error state. **Toggles:** knob slides. **Date picker:** opens inline under the field; chips + day tap set the date. **Nav:** switches destination; central + opens Create task. **Avatar:** user-uploadable.

## State Management
- **User/economy:** coins, xp, level, streak, xp-to-next. Mutate on task complete/uncomplete, purchases, buy-XP (100→40).
- **Tasks:** {id, title, tier, coins, xp, due, done, subtasks[]}; toggle done.
- **Pet:** happiness (0–100), hunger (0–100); derived mood; decay over time implied.
- **Store:** catalogue, category filter, search query, cart items+qty, purchase history, level-gated locks. **`group` (A|B)** — server-assigned, permanent, gates urgency rendering.
- **Group B timers:** countdown seconds + tick.
- **Telemetry:** views/cart-adds/purchases/sessions/returns logged per user for admin dashboards.
- **Profile:** uploaded avatar image.

## Assets (in `assets/`)
- **Logo:** `icon.svg`, `icon-light.svg`, `horizontal.svg`, `horizontal-light.svg`, `square.svg`, `square-light.svg` (dark = for light bg; light = for dark/brand fills). Terracotta fox-in-badge.
- **Animals:** `animals/fox.svg` (Mochi, starter pet), `animals/koala.svg`, `animals/penguin.svg`. The full set (~22 animals) lives in the source `tasktails/animals/` folder — request more as needed.
- Icons: Lucide package. Fonts: Fredoka + Nunito (Google Fonts).

## Files in this bundle
- `TaskTails Screens.dc.html` — all app + marketing screens (primary reference).
- `TaskTails Style Guide.dc.html` — tokens, type scale, component specs & states (live hover/press samples, nav, date picker, store header).
- `TaskTails Logo.dc.html` — logo lockups & app-icon sizes.
- `assets/` — logo + animal SVGs.

> Open the `.dc.html` files in any browser to view. Ignore `support.js` / `image-slot.js` / `doc-page.js` — prototype scaffolding, not app code.
