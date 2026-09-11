import { act } from "react";
import { createRoot } from "react-dom/client";
import { Trash2 } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/modal";

/**
 * #286 — a modal must not hand focus to one of its buttons.
 *
 * With no `autofocus`, the HTML spec's dialog focusing steps focus the first
 * focusable descendant, which was the confirm button — and on iOS it arrived
 * wearing the focus ring. The ring itself is correct (`globals.css` rings
 * `:focus-visible` only); focusing a *control* on open is what was wrong.
 *
 * The fix does not rely on React's `autoFocus` prop, which emits no
 * `autofocus` attribute on the client and fires before `showModal()` — it
 * focuses the heading explicitly, straight after opening the dialog. That
 * is a call this component makes itself, so it *is* testable here; only the
 * visible ring needs a real device.
 */
// jsdom ships `<dialog>` without `showModal()`/`close()`. Stubbed to track
// openness only — the focusing steps are the engine's job and are exactly
// what jsdom does not model, which is why this file asserts the markup
// contract rather than where focus actually lands.
vi.stubGlobal("HTMLDialogElement", window.HTMLDialogElement);
Object.assign(HTMLDialogElement.prototype, {
  showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  },
  close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  },
});

let host: HTMLDivElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function render(open = true) {
  host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <Modal
        open={open}
        icon={Trash2}
        title="Delete this task?"
        body="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
  });
  return host;
}

describe("Modal focus target", () => {
  it("puts focus on the heading when it opens, not on a button", () => {
    const container = render();

    expect(document.activeElement).toBe(container.querySelector("h2"));
  });

  it("leaves no button focused — the ring on iOS was a focused button", () => {
    const container = render();
    const buttons = [...container.querySelectorAll("button")];

    expect(buttons).not.toContain(document.activeElement);
  });

  it("makes the heading focusable without putting it in the tab order", () => {
    const heading = render().querySelector("h2")!;

    // -1 is the point: reachable by `focus()`, skipped by Tab, and not a
    // `:focus-visible` candidate the way a button is.
    expect(heading.tabIndex).toBe(-1);
  });

  it("keeps the buttons tabbable, so the dialog is still operable by keyboard", () => {
    const buttons = [...render().querySelectorAll("button")];

    expect(buttons.map((b) => b.textContent)).toEqual(["Delete", "Cancel"]);
    expect(buttons.every((b) => b.tabIndex === 0)).toBe(true);
  });

  it("still labels the dialog by that heading", () => {
    const container = render();
    const dialog = container.querySelector("dialog")!;

    expect(dialog.getAttribute("aria-labelledby")).toBe(
      container.querySelector("h2")!.id,
    );
  });
});
