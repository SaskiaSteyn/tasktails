# TaskTails — Handoff Addendum (3 new components)

Supplements the main handoff (`design_handoff_tasktails/README.md`). Same tokens/fonts/palette apply — see that doc for colors, type scale, buttons, inputs. All three live in `TaskTails Screens.dc.html`.

## 1. Choose username (screen — after Register, before Onboarding)
Full white 300×640 screen.
- **Step dots** at top: 3 pips, first active (22×6 terracotta `#E27A54` pill), rest 6×6 `#E7DDCC`.
- Circular icon badge (64px, `#FBEAE3` bg) with Lucide `user` in `#E27A54`.
- Title "Pick a username" (Fredoka 600, 23px), subtitle in `#8A8178`.
- **Username field in active state:** white fill, 2px `#E27A54` border, 4px focus ring `rgba(226,122,84,.16)`, leading `@` in `#B8AFA4`, value 700, blinking caret.
- **Availability line** below: Lucide `check` in `#5FA97E` + "@nico is available" (`#3F8C63` 700). Error variant would swap to urgency red.
- **Suggestions:** "SUGGESTIONS" overline + row of tappable chips (`#F6F1E9` fill, 1px `#EBE2D5`, radius 20).
- Primary "Continue" button, then a **"Skip for now"** text link (`#8A8178` 700) centered beneath it.
- State: `username` (string), debounced availability check → available / taken; Skip proceeds with an auto-generated handle.

## 2. Generic modal — confirm dialog (destructive)
Centered card over the standard scrim `rgba(46,42,38,.42)`.
- White card, radius 22, padding 24/22/20, shadow `0 20px 44px rgba(46,42,38,.28)`.
- Icon badge (56px circle) tinted to intent — destructive uses `#FBEAE3` bg + `#E27A54`/red trash icon.
- Title (Fredoka 600, 20px, centered) + body (`#8A8178`, 13px, centered, line-height 1.5).
- **Actions stacked vertically** (`flex-direction:column; gap:9px`): destructive button on top (`#DB4C3F`, white, shadow `0 6px 14px rgba(219,76,63,.35)`), secondary "Cancel" below (white, 1.5px `#E27A54` stroke + terracotta text). Both height 46, radius 12.

## 3. Generic modal — non-destructive
Identical shell to #2, different intent:
- Icon badge `#EEE9F5` bg + violet `#8478C4` icon (e.g. achievement/award).
- **Actions stacked vertically:** terracotta primary on top (`#E27A54`, shadow `0 6px 14px rgba(226,122,84,.35)`), secondary below (white + terracotta stroke).

### Modal notes (both)
- One shared component; props: `icon`, `iconTint`, `title`, `body`, `confirmLabel`, `confirmVariant` (primary | destructive), `cancelLabel`, `onConfirm`, `onCancel`.
- Buttons are always full-width and stacked (primary/destructive first, secondary second).
- Dismiss on scrim tap = cancel.
