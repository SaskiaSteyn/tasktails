# Handoff: TaskTails — Desktop layout

## Read this first: the running app is the source of truth

The implemented TaskTails codebase (Next.js App Router, Tailwind, `src/components/**`) is
**authoritative for everything except layout**. This bundle exists for one reason: to show how
the existing product should be arranged on a large screen.

Rules, in priority order:

1. **Components win.** If a card, row, badge, chip, button, toggle, progress bar or modal in
   these mocks looks different from the component already implemented — the animal card, the
   store item card, the task row, the cart panel, the settings toggle card, the level badge, the
   streak pill, the coin pill — **use the implemented component**. Do not restyle it to match
   the mock, and do not fork a "desktop variant" of it unless the layout genuinely cannot
   accommodate the existing one.
2. **Copy, data and behaviour win.** Labels, counts, currency values, quest names, thresholds,
   economy numbers and empty/error states come from the codebase and its rules, not from these
   mocks. All text in the mocks is placeholder-grade.
3. **Layout is what this bundle contributes.** Take from it: the persistent left rail instead of
   the bottom nav, the universal top header, two-pane and three-pane arrangements, table density,
   panel widths, which panels are pinned versus scrolling, and the 900px fallback.
4. **If something conflicts, ask — do not assume.** Where the mock implies a behaviour, entity,
   field, filter or route that does not exist in the codebase, stop and raise it. Do not invent
   API routes, Prisma fields, telemetry events or economy rules to satisfy a mock. Equally, if a
   mock omits something the implementation has (a badge, a state, a guardrail, a study-related
   stimulus), keep the implementation and flag the omission.

Anything in this document that reads as a visual spec is a *layout* spec. Anything that reads as
a component spec is a suggestion, subordinate to rule 1.

## About the design files

`TaskTails Desktop.dc.html` is a **design reference written in HTML** — a prototype of intended
desktop composition, not production code. It renders all screens stacked on one canvas at
1920×1080, plus a 900px tablet pair. Open it in a browser (needs `support.js` and `assets/`
alongside it, both included).

Do not port its markup, inline styles or asset paths. Recreate the layouts in the existing
Next.js app with Tailwind and the existing components.

## Fidelity

**High-fidelity for layout, indicative for surface detail.** Geometry (rail width, header height,
column widths, row heights, gaps, panel order) is intentional and should be matched. Colour,
type and component internals should come from `globals.css` tokens and existing components —
where the mock and the app disagree on those, the app is right.

## Screens in the bundle

Each `<section data-screen-label>` in the HTML is one screen. Mapping to existing routes:

| Mock screen | Route in app | Notes |
| --- | --- | --- |
| 01 Tasks — Home | `/tasks` | Rail + task list + right activity panel (zoo grid, weekly chart, next-badge card) |
| 02 Task detail — two-pane | `/tasks/[id]` | List stays visible left, detail right; save/delete pinned at the bottom of the detail pane |
| 03 New task — command modal | `/tasks` (sheet) | Existing `create-task-sheet` as a centred modal, ⌘N shortcut |
| 04 Store — Group A | `/store` | Category column, item grid, persistent cart rail |
| 05 Store — Group B urgency | `/store` | Same layout; all Group B stimuli come from the implemented badge/banner components |
| 06 Cart and checkout | `/store/cart` | Item table left, summary panel pinned full-height right |
| 07 Purchase history | `/store/history` | Dense table |
| 08 Petting zoo — sanctuary | `/zoo/[id]` | Large pet stage left, care panel + roster right |
| 09 Petting zoo — gallery | `/zoo` | Card grid |
| 10 Profile and achievements | `/profile`, `/profile/achievements` | Profile header + stats + achievement grid |
| 11 Leaderboard | `/profile/leaderboard` | Dense ranked table; current user row pinned in terracotta |
| 12 Settings | `/settings` | Section list + detail panel |
| 13 Log in / create account | `/(auth)/login`, `/register` | Brand panel left (600px), form right |
| 14 Onboarding — first quests | `/onboarding` | Progress card + three quest rows; quests are **Add a task / Complete a task / Buy a pet** per the implementation |
| 15/16 Tablet pair — 900px | — | Rail collapses to icons, right panel drops below the list, store grid goes 2-up |

## Layout system (the actual deliverable)

### Shell

- **Left rail, persistent, 248px**, `background: surface-muted` equivalent, 1px right border.
  Contents top to bottom: wordmark (27px tall), primary "New task" button (46px, ⌘N hint),
  nav list, then user identity block pinned to the bottom (`margin-top: auto`).
- **Nav items**: 6 rows — Tasks (with open-count badge), Store, Petting zoo (amber dot when a
  pet needs care), Leaderboard, Profile, Settings. Active row is the filled terracotta pill;
  inactive rows are muted ink with a hover tint. **Log out** is the last row of the nav list,
  in the danger ink colour.
- **Bottom identity block**: monogram avatar + display name + email. Use the implemented
  `monogram-avatar` and account data.
- The rail replaces `bottom-nav.tsx` on desktop. `AppShell`'s 400px phone frame does not apply
  at desktop widths — the app fills the viewport. Keep the bottom nav for the phone breakpoint;
  the rail and bottom nav are two presentations of the same nav model, so drive both from one
  route/tab list.
- **Universal header, 76px**, on every screen: page name on the left (Fredoka 23px); on the
  right, three read-only status chips in this order — **streak**, **coins**, **level**. Nothing
  else lives in the header. Page-specific controls (search, sort, filters, primary actions)
  belong in the page body or the relevant panel, not the header.

### Content grids

- Page padding: 28–34px horizontal, 26–30px vertical. Gaps between major columns: 26–28px.
- **Right-hand panels**: 376–400px, `flex: none`, stretch full height. Pinned action rows use
  `margin-top: auto` inside the panel (cart summary, task detail actions).
- **Tables** (purchase history, leaderboard): explicit grid template columns, header row at
  10.5px/800 uppercase with letter-spacing, body rows ~58px, 1px row separators, right-aligned
  numeric columns.
- **Store**: category column ~200px, item grid `repeat(auto-fill, minmax(~260px, 1fr))`,
  cart rail always visible on the right.
- **Task list**: dense rows (~58px) with checkbox, title, tier chip, due date, reward on the right.

### 900px tablet behaviour

- Rail collapses to a 76px icon-only rail (labels hidden, active pill retained).
- Right-hand activity/care panels move below the primary column.
- Store grid drops to 2-up; tables keep their columns but tighten padding.
- Header shrinks to 66px and the status chips shrink accordingly.

## What this design deliberately removed

Several panels in earlier drafts were cut as noise; do not reintroduce them from the mocks:
reward-on-complete and activity-log panels on task detail, store sort/hide-locked block,
cart cross-sell and info note, purchase-history stat tiles, leaderboard footer note and period
toggle, zoo collection progress bar and filter chips, "Danger zone" settings item.

If any of those correspond to shipped functionality, keep the functionality and ask where it
should live in the desktop layout.

## Assets

`assets/` contains the wordmark/icon SVGs and the placeholder animal, habitat and shop art used
by the prototype. The real app already ships its own art under `public/animals`,
`public/backgrounds`, `public/accessories` and `public/brand` — **use those**, via the existing
`pet-art` / `item-visual` components.

## Files

- `TaskTails Desktop.dc.html` — all desktop screens plus the 900px pair
- `support.js`, `assets/` — needed only to open the prototype in a browser
- Mobile reference (already handed off previously): `design_handoff/` in the repo root

## Open questions to raise before building

1. Does the desktop rail get its own route-level layout, or does `AppShell` gain a breakpoint
   branch? (Preference: one nav model, two presentations.)
2. Where should store search and sort live now that the header is status-only?
3. Task detail as a route (`/tasks/[id]`) vs. a master-detail pane on `/tasks` — the mock shows
   the pane; the app has the route.
4. Is the desktop layout in scope for the study's Group A/B instrumentation as-is, or does the
   changed store layout need its own telemetry review?
