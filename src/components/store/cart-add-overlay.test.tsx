import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CartAddOverlay, type CartAdd } from "@/components/store/cart-add-overlay";

/**
 * #274 — the add-to-cart flourish.
 *
 * SSR-only, like `store-browser.test.tsx`: the geometry is all computed
 * during render from the measured points handed in, so the markup is where
 * it is visible. What the flight actually looks like is a CSS keyframe and
 * is verified by using the store; what is worth pinning here is that the
 * travel vector is the difference between the two ends, and that a missing
 * end degrades to a toast rather than to a mark flying to the origin.
 *
 * `window` is referenced for the right-edge clamp, which jsdom provides.
 */
function add(overrides: Partial<CartAdd> = {}): CartAdd {
  return {
    id: 1,
    label: "Sunflower seeds",
    origin: { x: 100, y: 400 },
    cart: { x: 280, y: 60 },
    ...overrides,
  };
}

const render = (value: CartAdd | null) =>
  renderToStaticMarkup(<CartAddOverlay add={value} onDismiss={() => {}} />);

describe("CartAddOverlay", () => {
  it("renders nothing until something is added", () => {
    expect(render(null)).toBe("");
  });

  it("flies from the pressed button to the cart by their difference", () => {
    const html = render(add());

    // 280 - 100 across, 60 - 400 up.
    expect(html).toContain("--cart-fly-x:180px");
    expect(html).toContain("--cart-fly-y:-340px");
    // Starts at the button, not at a corner.
    expect(html).toMatch(/left:100px/);
    expect(html).toMatch(/top:400px/);
    expect(html).toContain("animate-cart-fly");
  });

  it("still toasts when there is no cart icon on screen, without a flight", () => {
    // The `xl:` store swaps the icon for the cart rail, so there is no target.
    const html = render(add({ cart: null }));

    expect(html).not.toContain("animate-cart-fly");
    expect(html).toContain("Added to cart");
    // Centred rather than anchored to nothing.
    expect(html).toContain("translateX(-50%)");
  });

  it("still toasts when the button could not be measured", () => {
    const html = render(add({ origin: null }));

    expect(html).not.toContain("animate-cart-fly");
    expect(html).toContain("Added to cart");
  });

  it("names the item, so two quick adds are told apart", () => {
    expect(render(add({ label: "2 Sunflower seeds" }))).toContain("2 Sunflower seeds");
  });

  it("is hidden from screen readers — StoreItemCard already announces the add", () => {
    expect(render(add())).toContain('aria-hidden="true"');
  });
});
