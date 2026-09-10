import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "@/components/tasks/date-picker";

/**
 * #272 — opening the picker inside the create-task sheet scrolls it back into
 * view, so its panel is never left below the fold.
 *
 * A real client render: the scroll happens in the open effect, which SSR
 * never runs. jsdom has no layout engine and stubs nothing for
 * `scrollIntoView`, so the assertion is on the call and its options — that
 * `block: "nearest"` is asked for (scroll the minimum, do nothing when
 * already visible) and that no `behavior` is passed, which is what lets
 * globals.css's reduce-motion rules decide.
 */
const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

let container: HTMLDivElement | undefined;

function renderPicker(props: { scrollIntoViewOnOpen?: boolean }) {
  container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(<DatePicker value={null} onChange={() => {}} label="DUE" {...props} />);
  });
  return container.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
}

afterEach(() => {
  scrollIntoView.mockClear();
  container?.remove();
});

describe("DatePicker", () => {
  it("scrolls itself into view when opened with scrollIntoViewOnOpen", () => {
    const trigger = renderPicker({ scrollIntoViewOnOpen: true });
    act(() => trigger.click());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("does not scroll when opened without the prop", () => {
    const trigger = renderPicker({});
    act(() => trigger.click());

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
