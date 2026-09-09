import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { useSwipeToDismiss } from "@/lib/swipe-to-dismiss";

/**
 * #261 — the handlers are called with real elements as `event.target` so the
 * `[data-sheet-scroll]` lookup is exercised for real, but the touch objects
 * themselves are hand-built: jsdom has no `TouchEvent`, and the logic under
 * test is the arithmetic and the scroll check, not React's event plumbing.
 */
type Api = ReturnType<typeof useSwipeToDismiss>;

function mount(onDismiss: () => void) {
  let api!: Api;
  function Probe() {
    api = useSwipeToDismiss(onDismiss);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  return {
    get: () => api,
    /** Re-reads `api` after each act(), since every drag frame re-renders. */
    touch: (name: "onTouchStart" | "onTouchMove" | "onTouchEnd", y: number, target: Element) => {
      act(() =>
        api.swipeProps[name]({
          touches: [{ clientY: y }],
          target,
        } as unknown as React.TouchEvent),
      );
    },
  };
}

/** A sheet whose scroller is scrolled to `scrollTop`, and the row inside it a finger would land on. */
function sheet(scrollTop: number) {
  const scroller = document.createElement("div");
  scroller.setAttribute("data-sheet-scroll", "");
  Object.defineProperty(scroller, "scrollTop", { value: scrollTop, writable: true });
  const row = document.createElement("p");
  scroller.append(row);
  return row;
}

describe("useSwipeToDismiss", () => {
  it("closes when dragged past the threshold, and tracks the finger on the way", () => {
    const onDismiss = vi.fn();
    const h = mount(onDismiss);
    const target = sheet(0);

    h.touch("onTouchStart", 400, target);
    h.touch("onTouchMove", 460, target);
    expect(h.get().swipeProps.style).toEqual({ transform: "translateY(60px)" });
    // Still following the finger, so no transition to lag behind it.
    expect(h.get().swipeProps.className).toBeUndefined();

    h.touch("onTouchMove", 500, target);
    h.touch("onTouchEnd", 500, target);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(h.get().swipeProps.style).toBeUndefined();
  });

  it("springs back instead of closing when the drag is too short", () => {
    const onDismiss = vi.fn();
    const h = mount(onDismiss);
    const target = sheet(0);

    h.touch("onTouchStart", 400, target);
    h.touch("onTouchMove", 460, target);
    h.touch("onTouchEnd", 460, target);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(h.get().swipeProps.style).toBeUndefined();
    expect(h.get().swipeProps.className).toContain("transition-transform");
  });

  it("ignores an upward drag", () => {
    const h = mount(vi.fn());
    const target = sheet(0);

    h.touch("onTouchStart", 400, target);
    h.touch("onTouchMove", 300, target);
    expect(h.get().swipeProps.style).toBeUndefined();
  });

  it("leaves the gesture to the list when the list is scrolled down", () => {
    const onDismiss = vi.fn();
    const h = mount(onDismiss);
    const target = sheet(25);

    h.touch("onTouchStart", 400, target);
    h.touch("onTouchMove", 600, target);
    h.touch("onTouchEnd", 600, target);

    expect(h.get().swipeProps.style).toBeUndefined();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
