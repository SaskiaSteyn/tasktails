import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DueCountdown } from "@/components/tasks/due-soon-banner";

/** #336 — what the task card's pill reads for a deadline `offsetMs` from now. */
function pillFor(offsetMs: number): string {
  const now = new Date(2026, 8, 29, 14, 0);
  vi.useFakeTimers({ now });
  const container = document.createElement("div");
  act(() => createRoot(container).render(<DueCountdown dueDate={new Date(now.getTime() + offsetMs)} />));
  act(() => vi.advanceTimersByTime(0));
  return container.textContent ?? "";
}

afterEach(() => vi.useRealTimers());

describe("DueCountdown (#336)", () => {
  it("reads hours and minutes, then seconds in the last half hour", () => {
    expect(pillFor(2 * 3600e3 + 5 * 60e3)).toBe("2h 5m");
    expect(pillFor(10 * 60e3)).toBe("10:00");
  });

  it("says Overdue once the deadline has passed", () => {
    expect(pillFor(-60e3)).toBe("Overdue");
  });

  it("stays out of the way more than a day ahead", () => {
    expect(pillFor(25 * 3600e3)).toBe("");
  });
});
