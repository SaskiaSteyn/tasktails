"use client";

import { useRef, useState } from "react";

/**
 * Swipe a bottom sheet down to close it (#261).
 *
 * The two sheets (`CreateTaskSheet`, `FeedSheet`) are hand-duplicated
 * `<dialog>`s rather than one shared component, so this is a hook rather
 * than a wrapper — the smaller thing to share, and it leaves both sheets'
 * own markup untouched.
 *
 * Reported as "swiping down doesn't close the menu, instead the background
 * scrolls". Both halves are real: a native modal `<dialog>` blocks clicks
 * behind it but not touch scrolling, so a downward drag on the sheet's own
 * chrome — which is not a scroll container — chained to the page underneath
 * and scrolled it. The gesture does something now, and `touch-action: none`
 * on the grabber (`SHEET_GRAB_CLASS`) plus `overscroll-behavior: contain` on
 * the scroller (`SHEET_SCROLL_CLASS`) is what stops the page moving instead.
 *
 * A drag that starts inside a scrolled-down list belongs to the list, not
 * the sheet — hence the `scrollTop` check. The scroller identifies itself
 * with `data-sheet-scroll` rather than a ref, so callers whose scroller is a
 * `<form>` and callers whose scroller is a `<div>` share one hook without
 * fighting the ref's element type.
 */

/** How far down before letting go closes it. Roughly a thumb's travel; less turns a scroll nudge into a dismissal. */
const DISMISS_AT_PX = 80;

/** Put this on the sheet's scrollable region, together with `data-sheet-scroll`. */
export const SHEET_SCROLL_CLASS = "overscroll-contain";

/** Put this on the sheet's grabber: no scrolling ever starts from the one part of the sheet that is pure gesture surface. */
export const SHEET_GRAB_CLASS = "touch-none";

export function useSwipeToDismiss(onDismiss: () => void) {
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function end() {
    if (startY.current === null) return;
    startY.current = null;
    if (dragY > DISMISS_AT_PX) onDismiss();
    setDragY(0);
  }

  return {
    /** Spread onto the sheet's own container, before its own `className`. */
    swipeProps: {
      onTouchStart: (event: React.TouchEvent) => {
        const scroller = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-sheet-scroll]",
        );
        if (scroller && scroller.scrollTop > 0) return;
        startY.current = event.touches[0].clientY;
      },
      onTouchMove: (event: React.TouchEvent) => {
        if (startY.current === null) return;
        // Down only. An upward drag on a sheet that is already at its
        // maximum height has nowhere to go, and rubber-banding it up would
        // just uncover the scrim.
        setDragY(Math.max(0, event.touches[0].clientY - startY.current));
      },
      onTouchEnd: end,
      onTouchCancel: end,
      style: dragY ? { transform: `translateY(${dragY}px)` } : undefined,
      // Only while settling back: during the drag the sheet has to track the
      // finger exactly, and a transition would make it lag behind. Keyed off
      // `dragY` rather than "is a finger down", because that is the state
      // that actually moves the sheet — and reading the ref here would be
      // both non-reactive and a lint error.
      className: dragY ? undefined : "transition-transform duration-200 ease-out",
    },
  };
}
