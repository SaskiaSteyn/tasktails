import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CoinPill } from "@/components/ui/coin";

/**
 * #256 — the balance rolls to a new value instead of snapping to it.
 *
 * A real client render, not `renderToStaticMarkup` like the other component
 * tests here: the roll lives entirely in an effect, so SSR would only ever
 * show the initial number and prove nothing. `requestAnimationFrame` is
 * stubbed to a controllable clock so the intermediate frames are inspectable
 * rather than raced against.
 *
 * `next/image` is stubbed out — the coin mark isn't what this is about, and
 * the real one needs Next's image runtime.
 */
vi.mock("next/image", () => ({ default: () => null }));

let now = 0;
let queued: FrameRequestCallback[] = [];
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  queued.push(cb);
  return queued.length;
});
vi.stubGlobal("cancelAnimationFrame", () => {});
vi.stubGlobal("performance", { now: () => now });
vi.stubGlobal("matchMedia", () => ({ matches: false }));

/** Advance the fake clock and drain whatever frames were queued for it. */
function advance(ms: number) {
  now += ms;
  const due = queued;
  queued = [];
  act(() => due.forEach((cb) => cb(now)));
}

afterEach(() => {
  now = 0;
  queued = [];
});

describe("CoinPill", () => {
  it("rolls up to a new balance rather than snapping to it", () => {
    const host = document.createElement("div");
    const root = createRoot(host);

    act(() => root.render(<CoinPill coins={100} />));
    expect(host.textContent).toBe("100");

    act(() => root.render(<CoinPill coins={1100} />));
    // Still the old number until the first frame runs.
    expect(host.textContent).toBe("100");

    advance(200);
    const midway = Number(host.textContent?.replace(/,/g, ""));
    expect(midway).toBeGreaterThan(100);
    expect(midway).toBeLessThan(1100);

    // Past ROLL_MS the roll is finished and lands exactly on the new balance,
    // not near it — a rounding error here would leave a wrong number on screen.
    advance(1000);
    expect(host.textContent).toBe("1,100");

    // The label always reads the settled balance, never a frame of the roll.
    expect(host.querySelector("[role=img]")?.getAttribute("aria-label")).toBe("1,100 coins");
  });

  it("skips the animation when the participant asked for reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const host = document.createElement("div");
    const root = createRoot(host);

    act(() => root.render(<CoinPill coins={10} />));
    act(() => root.render(<CoinPill coins={90} />));

    // One frame, and it is already the final value — no intermediate steps.
    advance(0);
    expect(host.textContent).toBe("90");
    expect(queued).toHaveLength(0);

    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });
});
