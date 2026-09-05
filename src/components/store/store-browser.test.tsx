import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

describe("StoreBrowser", () => {
  it("renders one page of cards, not the whole catalogue", () => {
    const markup = renderToStaticMarkup(
      <StoreBrowser items={items} level={1} luckyBoxPrice={100} />,
    );
    expect(cardCount(markup)).toBe(24);
  });

  it("renders every card when the catalogue is smaller than a page", () => {
    const markup = renderToStaticMarkup(
      <StoreBrowser items={items.slice(0, 5)} level={1} luckyBoxPrice={100} />,
    );
    expect(cardCount(markup)).toBe(5);
  });
});
