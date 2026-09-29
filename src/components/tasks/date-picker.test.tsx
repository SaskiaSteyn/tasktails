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

/** #336 — the time dropdown, driven the way a user would: by clicking. */
function mount(initial: Date | null) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let value = initial;
  const render = () =>
    root.render(
      <DatePicker
        value={value}
        onChange={(next) => {
          value = next;
          render();
        }}
        label="DUE"
      />,
    );
  act(render);

  const button = (text: string) =>
    [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
    );
  const click = (text: string) => act(() => button(text)!.click());

  return {
    get value() {
      return value;
    },
    button,
    click,
    container,
  };
}

function openTime(picker: ReturnType<typeof mount>) {
  const trigger = [...picker.container.querySelectorAll("button[aria-expanded]")][1] as HTMLElement;
  act(() => trigger.click());
}

describe("DatePicker time dropdown (#336)", () => {
  it("picks an hour, then a minute, and keeps the day", () => {
    const picker = mount(new Date(2026, 9, 2));
    openTime(picker);
    const minute30 = () => picker.button("30") as HTMLButtonElement;
    // Hours stop at 23, so "30" can only be the minute.
    expect(minute30().disabled).toBe(true); // hour first
    picker.click("14");
    act(() => minute30().click());
    expect(picker.value).toEqual(new Date(2026, 9, 2, 14, 30));
    expect(picker.button("15")).toBeUndefined(); // closed
  });

  it("offers minutes in tens, and never midnight on the dot", () => {
    const picker = mount(new Date(2026, 9, 2));
    openTime(picker);
    const [hours, minutes] = [...picker.container.querySelectorAll(".grid-cols-2 > div")].map(
      (column) => [...column.querySelectorAll<HTMLButtonElement>("button")],
    );
    expect(minutes.map((b) => b.textContent)).toEqual(["00", "10", "20", "30", "40", "50"]);
    act(() => hours[0].click()); // hour 00
    expect(minutes[0].disabled).toBe(true);
    expect(minutes[1].disabled).toBe(false);
  });

  it("changing the date keeps the time; Any time clears it", () => {
    const picker = mount(new Date(2026, 9, 2, 14, 30));
    const dateTrigger = picker.container.querySelector<HTMLElement>("button[aria-expanded]")!;
    act(() => dateTrigger.click());
    picker.click("Tomorrow");
    expect([picker.value!.getHours(), picker.value!.getMinutes()]).toEqual([14, 30]);

    openTime(picker);
    picker.click("Any time");
    expect([picker.value!.getHours(), picker.value!.getMinutes()]).toEqual([0, 0]);
  });
});
