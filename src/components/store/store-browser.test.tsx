import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * #232 — the store grid draws a page of cards, not the whole catalogue.
 *
 * SSR-only (`renderToStaticMarkup`): the first paint is exactly what this
 * ticket is about, and it renders before any effect — so the initial cap is
 * the one branch worth pinning. The scroll sentinel's `IntersectionObserver`
 * lives in a `useEffect` and doesn't run here; that half is verified by
 * scrolling the real store.
 *
 * The two heavy children are stubbed rather than rendered: `StoreItemCard`
 * pulls `next/navigation` and `next/image`, and `LuckyBoxCard` the same, none
 * of which this test is about — a countable marker per card is enough.
 */
vi.mock("@/components/store/store-item-card", () => ({
  StoreItemCard: () => <li data-card />,
}));
vi.mock("@/components/store/lucky-box-card", () => ({
  LuckyBoxCard: () => null,
}));
// #280 put the Sell tab's cards in this component; neither is what these
// tests are about, and `BuyXpCard` pulls `next/navigation` besides.
vi.mock("@/components/profile/buy-xp-card", () => ({
  BuyXpCard: () => <div data-buy-xp />,
}));
vi.mock("@/components/store/sell-items-card", () => ({
  SellItemsCard: () => <div data-sell-card />,
}));

const { StoreBrowser } = await import("@/components/store/store-browser");

const items = Array.from({ length: 70 }, (_, i) => ({
  id: `item-${i}`,
  name: `Item ${i}`,
  description: "",
  category: "FOOD",
  rarity: null,
  coinPrice: 10,
  levelRequired: 1,
  imageUrl: "/food/apple.svg",
  createdAt: new Date(),
  updatedAt: new Date(),
  locked: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
})) as any;

function cardCount(markup: string): number {
  return markup.split("data-card").length - 1;
}

/** The props every case shares — only `items` varies. */
const base = {
  level: 1,
  luckyBoxPrice: 100,
  coins: 0,
  buyXpCost: 100,
  buyXpGain: 40,
};

describe("StoreBrowser", () => {
  it("renders one page of cards, not the whole catalogue", () => {
    const markup = renderToStaticMarkup(
      <StoreBrowser {...base} items={items} />,
    );
    expect(cardCount(markup)).toBe(24);
  });

  it("renders every card when the catalogue is smaller than a page", () => {
    const markup = renderToStaticMarkup(
      <StoreBrowser {...base} items={items.slice(0, 5)} />,
    );
    expect(cardCount(markup)).toBe(5);
  });
});

/**
 * #280 — Buy / Sell tabs above the search bar. Buy is the default and
 * renders the catalogue; Sell replaces it with the two cards and drops the
 * search box and category chips, which have no catalogue to filter.
 *
 * SSR-only, like the paging cases above: the default pane is what the first
 * paint shows, and switching panes is a `useState` this render cannot
 * exercise. What is worth pinning here is that Buy is the default and that
 * the tabs themselves are in the markup above the search box.
 */
describe("StoreBrowser tabs", () => {
  it("opens on Buy, with the catalogue and its search box", () => {
    const markup = renderToStaticMarkup(
      <StoreBrowser {...base} items={items} />,
    );

    expect(markup).toContain("Search items");
    expect(cardCount(markup)).toBe(24);
  });

  it("puts the tabs above the search box", () => {
    const markup = renderToStaticMarkup(
      <StoreBrowser {...base} items={items} />,
    );

    expect(markup.indexOf(">Buy<")).toBeGreaterThan(-1);
    expect(markup.indexOf(">Buy<")).toBeLessThan(
      markup.indexOf("Search items"),
    );
    expect(markup.indexOf(">Buy<")).toBeLessThan(markup.indexOf(">Sell<"));
  });

  it("marks Buy pressed and Sell not, so the control reads as a pair", () => {
    const markup = renderToStaticMarkup(
      <StoreBrowser {...base} items={items} />,
    );
    const buy = markup.slice(markup.indexOf('aria-pressed="true"'));

    expect(buy).toContain(">Buy<");
    expect(markup).toContain('aria-pressed="false"');
  });
});

/**
 * The pane switch itself — a real client render, because it lives in
 * `useState` and SSR can only ever show the default. Same approach
 * `coin.test.tsx` takes for its animation.
 */
let host: HTMLDivElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

function renderBrowser() {
  host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(<StoreBrowser {...base} items={items.slice(0, 5)} />);
  });
  return host;
}

function tab(container: HTMLElement, label: string) {
  return [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === label,
  )!;
}

describe("switching to Sell", () => {
  it("swaps the catalogue for the two cards", () => {
    const container = renderBrowser();
    expect(container.querySelector("[data-sell-card]")).toBeNull();

    act(() => tab(container, "Sell").click());

    expect(container.querySelector("[data-sell-card]")).not.toBeNull();
    expect(container.querySelector("[data-buy-xp]")).not.toBeNull();
    expect(container.querySelectorAll("[data-card]")).toHaveLength(0);
  });

  it("drops the search box and category chips, which have nothing to filter", () => {
    const container = renderBrowser();
    expect(container.textContent).toContain("Search items");

    act(() => tab(container, "Sell").click());

    expect(container.textContent).not.toContain("Search items");
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it("goes back to the catalogue on Buy", () => {
    const container = renderBrowser();
    act(() => tab(container, "Sell").click());
    act(() => tab(container, "Buy").click());

    expect(container.querySelectorAll("[data-card]")).toHaveLength(5);
    expect(container.querySelector("[data-sell-card]")).toBeNull();
  });
});
