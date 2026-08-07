import { StoreItemCategory, StoreItemRarity } from "@/generated/prisma/client";
import type { AchievementCriterion } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";

/**
 * INF-20 — populates `StoreItem` with the catalogue documented in
 * `design_handoff/`. Nothing else in the store module writes `StoreItem`
 * rows (see the AGENTS.md note on INF-20), so this is the single source for
 * them.
 *
 * Deliberately small: `TaskTails Screens.dc.html` only grounds 5 items with
 * real names and prices (Sunflower seeds, Red collar, Cosy den, Treat box,
 * and the locked "Fox kit" example). The store gate table in
 * `economy_system.md` prices ranges per level tier without listing every
 * item, and doesn't cover most of the 4-category x 5-level grid at all — the
 * rest is deliberately left unseeded rather than inventing catalogue data
 * that isn't documented anywhere. A later ticket can expand this list.
 *
 * Animal count: economy_system.md frames the animal unlocks as a "second
 * animal type" at Level 7 and a "third" at Level 10 — a deliberately scarce,
 * timed unlock tied to the study's urgency-exposure design, not a full
 * roster. Only 3 animal types are seeded, matching the only 3 SVGs actually
 * staged in `public/animals/`: Koala (Level 1 starter — the "Buy 1 animal"
 * onboarding goal needs something purchasable immediately, and the gate
 * table's Level 1 row is the baseline tier everything else builds on), Fox
 * (Level 7 — "Fox kit"/"2nd animal"/"Unlocks at Lvl 7" is the Store mock's
 * own explicit label, taken over the README's looser "starter pet" aside),
 * and Penguin (Level 10, the remaining unused asset, as the third type).
 *
 * `imageUrl` for the non-animal items is a lucide-react icon name, not a
 * file path — the mock renders food/accessories/decorations as flat colour
 * swatches, not illustrated artwork, and no such artwork exists yet. Animal
 * items point at the real SVGs in `public/animals/`.
 *
 * Idempotent: looks up by `name` + `category` before writing, so re-running
 * the seed updates the existing row instead of duplicating it. Neither field
 * is a unique constraint in the schema (INF-04) — enforcing that is out of
 * scope here — so this checks in application code rather than using
 * `upsert`. Matching needs *both* fields, not `name` alone (GACHA-03): the
 * real catalogue below has two same-named-but-different items — "Fish" is
 * both a Food item (220 coins) and a Decoration (150 coins) — and a
 * name-only lookup would collapse them onto one row.
 *
 * **GACHA-03 (2026-08-07)** — added `rarity` (`StoreItemRarity`, from
 * `GACHA-01`) and expanded the catalogue toward *Gatcha stuffs.pdf*'s full
 * roster, the list `research_gacha_mechanics.md` calls "the absolute
 * accurate list of all the items in the app". That PDF has 68 unique items
 * across the same 4 categories (22 animals, 16 decorations, 10 food, 20
 * accessories) — this is what the Lucky Box (`GACHA-04`, not yet built)
 * draws its pool from.
 *
 * Six of INF-20's original 7 items turned out to already match a PDF row
 * exactly on level *and* price, so they were left in place (same `name`, so
 * no history-breaking rename) and just gained a `rarity`: "Sunflower seeds"
 * = PDF's "Seed" (Food, Lvl 1, 40, Common), "Red collar" = "Collar"
 * (Accessories, Lvl 1, 65, Common), "Treat box" = "Carrots" (Food, Lvl 3,
 * 120, Rare), "Koala kit" = "Koala" (Animals, Lvl 1, 5, Common), "Fox kit" =
 * "Fox" (Animals, Lvl 7, 550, Epic), "Penguin kit" = "Penguin" (Animals,
 * Lvl 10, 1200, Epic). **"Cosy den" (Decorations, Lvl 5, 280) has no PDF
 * match at that level/price** — left as-is with no `rarity`, rather than
 * guessing one; whoever eventually reconciles it should treat that as an
 * open gap, not an oversight.
 *
 * The other 62 PDF items are net-new rows — **except the 19 non-seeded
 * animals**, deliberately still not added: `ItemWell` (`item-visual.tsx`)
 * renders every `ANIMALS`-category item as `next/image` off `imageUrl`
 * unconditionally, never a lucide icon, so seeding an animal with no real
 * SVG in `public/animals/` would 404 across the Store, Pet customizer and
 * feed sheet — the same asset constraint INF-20 already documented above,
 * still true. Only the 43 non-animal items (8 food, 19 accessories, 16
 * decorations) are added here; the remaining 19 animals need real artwork
 * before they can be seeded.
 */
const catalogue: Array<{
  name: string;
  category: StoreItemCategory;
  levelRequired: number;
  coinPrice: number;
  imageUrl: string;
  rarity?: StoreItemRarity;
}> = [
  // ---- INF-20's original 7, now carrying a rarity where the PDF matches ----
  {
    name: "Sunflower seeds",
    category: StoreItemCategory.FOOD,
    levelRequired: 1,
    coinPrice: 40,
    imageUrl: "wheat",
    rarity: StoreItemRarity.COMMON, // = PDF "Seed"
  },
  {
    name: "Red collar",
    category: StoreItemCategory.ACCESSORIES,
    levelRequired: 1,
    coinPrice: 65,
    imageUrl: "shirt",
    rarity: StoreItemRarity.COMMON, // = PDF "Collar"
  },
  {
    name: "Treat box",
    category: StoreItemCategory.FOOD,
    levelRequired: 3,
    coinPrice: 120,
    imageUrl: "package",
    rarity: StoreItemRarity.RARE, // = PDF "Carrots" (Food)
  },
  {
    // No PDF row matches Decorations/Lvl5/280 — left without a rarity
    // rather than guessing one. See the file doc comment.
    name: "Cosy den",
    category: StoreItemCategory.DECORATIONS,
    levelRequired: 5,
    coinPrice: 280,
    imageUrl: "home",
  },
  {
    // The starter animal, and deliberately almost free. Onboarding (ONB-01)
    // asks a new participant to add a task, complete it, then buy a pet — so
    // the price has to be inside what one completion can pay, and the smallest
    // completion in the economy is a Trivial task at 5 coins. Was 200, which
    // no first completion could reach.
    //
    // This sits below claude-memory/economy_system.md's 30–80 band for the
    // level-1 gate. That band describes food and accessories; the starter
    // animal is the onboarding runway and is priced to clear it, on the user's
    // call (2026-07-29). The level-7 and level-10 animals are untouched, so the
    // gate table still governs everything the 14-day earnings model was
    // calibrated against.
    name: "Koala kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 1,
    coinPrice: 5,
    imageUrl: "/animals/koala.svg",
    rarity: StoreItemRarity.COMMON, // = PDF "Koala" ("Common*")
  },
  {
    name: "Fox kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 7,
    coinPrice: 550,
    imageUrl: "/animals/fox.svg",
    rarity: StoreItemRarity.EPIC, // = PDF "Fox"
  },
  {
    name: "Penguin kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 10,
    coinPrice: 1200,
    imageUrl: "/animals/penguin.svg",
    rarity: StoreItemRarity.EPIC, // = PDF "Penguin"
  },

  // ---- GACHA-03: the rest of Gatcha stuffs.pdf's Food table ----
  { name: "Steak", category: StoreItemCategory.FOOD, levelRequired: 7, coinPrice: 480, imageUrl: "beef", rarity: StoreItemRarity.EPIC },
  { name: "Chicken", category: StoreItemCategory.FOOD, levelRequired: 3, coinPrice: 150, imageUrl: "drumstick", rarity: StoreItemRarity.RARE },
  { name: "Hay", category: StoreItemCategory.FOOD, levelRequired: 1, coinPrice: 30, imageUrl: "wheat", rarity: StoreItemRarity.COMMON },
  { name: "Fish", category: StoreItemCategory.FOOD, levelRequired: 5, coinPrice: 220, imageUrl: "fish", rarity: StoreItemRarity.RARE },
  { name: "Lettuce", category: StoreItemCategory.FOOD, levelRequired: 1, coinPrice: 45, imageUrl: "leafy-green", rarity: StoreItemRarity.COMMON },
  { name: "Branch", category: StoreItemCategory.FOOD, levelRequired: 1, coinPrice: 50, imageUrl: "sprout", rarity: StoreItemRarity.COMMON },
  { name: "Shrimp", category: StoreItemCategory.FOOD, levelRequired: 10, coinPrice: 950, imageUrl: "shrimp", rarity: StoreItemRarity.EPIC },
  { name: "Bananas", category: StoreItemCategory.FOOD, levelRequired: 7, coinPrice: 420, imageUrl: "banana", rarity: StoreItemRarity.EPIC },

  // ---- GACHA-03: the rest of Gatcha stuffs.pdf's Accessories table ----
  // Hats and ties each share one loose-fit icon (lucide has no per-style hat
  // or tie glyphs) — same "reasonable stand-in, not literal artwork"
  // precedent INF-20 already set with "wheat"/"shirt"/"package"/"home" above.
  { name: "Fedora hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 3, coinPrice: 130, imageUrl: "hard-hat", rarity: StoreItemRarity.RARE },
  { name: "Baller hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 5, coinPrice: 240, imageUrl: "hard-hat", rarity: StoreItemRarity.RARE },
  { name: "Cowboy hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 5, coinPrice: 280, imageUrl: "hard-hat", rarity: StoreItemRarity.RARE },
  { name: "Top hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 7, coinPrice: 480, imageUrl: "hard-hat", rarity: StoreItemRarity.EPIC },
  { name: "Pirate hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 7, coinPrice: 550, imageUrl: "hard-hat", rarity: StoreItemRarity.EPIC },
  { name: "Jester hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 5, coinPrice: 320, imageUrl: "hard-hat", rarity: StoreItemRarity.RARE },
  { name: "Plain tie (red)", category: StoreItemCategory.ACCESSORIES, levelRequired: 1, coinPrice: 35, imageUrl: "shirt", rarity: StoreItemRarity.COMMON },
  { name: "Stripe tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 1, coinPrice: 40, imageUrl: "shirt", rarity: StoreItemRarity.COMMON },
  { name: "Bow tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 1, coinPrice: 45, imageUrl: "shirt", rarity: StoreItemRarity.COMMON },
  { name: "Heart tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 1, coinPrice: 50, imageUrl: "shirt", rarity: StoreItemRarity.COMMON },
  { name: "Stars tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 1, coinPrice: 55, imageUrl: "shirt", rarity: StoreItemRarity.COMMON },
  { name: "Gingham tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 1, coinPrice: 60, imageUrl: "shirt", rarity: StoreItemRarity.COMMON },
  { name: "Running sunglasses", category: StoreItemCategory.ACCESSORIES, levelRequired: 3, coinPrice: 170, imageUrl: "glasses", rarity: StoreItemRarity.RARE },
  { name: "Reading glasses", category: StoreItemCategory.ACCESSORIES, levelRequired: 3, coinPrice: 150, imageUrl: "glasses", rarity: StoreItemRarity.RARE },
  { name: "Aviators", category: StoreItemCategory.ACCESSORIES, levelRequired: 10, coinPrice: 1000, imageUrl: "glasses", rarity: StoreItemRarity.EPIC },
  { name: "Harry Potter glasses", category: StoreItemCategory.ACCESSORIES, levelRequired: 20, coinPrice: 2800, imageUrl: "glasses", rarity: StoreItemRarity.LEGENDARY },
  { name: "Oversized sunglasses", category: StoreItemCategory.ACCESSORIES, levelRequired: 3, coinPrice: 190, imageUrl: "glasses", rarity: StoreItemRarity.RARE },
  { name: "Flower crown", category: StoreItemCategory.ACCESSORIES, levelRequired: 10, coinPrice: 1300, imageUrl: "flower-2", rarity: StoreItemRarity.EPIC },
  { name: "Crown", category: StoreItemCategory.ACCESSORIES, levelRequired: 20, coinPrice: 3800, imageUrl: "crown", rarity: StoreItemRarity.LEGENDARY },

  // ---- GACHA-03: the rest of Gatcha stuffs.pdf's Decor table ----
  { name: "Hearts", category: StoreItemCategory.DECORATIONS, levelRequired: 1, coinPrice: 30, imageUrl: "heart", rarity: StoreItemRarity.COMMON },
  { name: "Stars", category: StoreItemCategory.DECORATIONS, levelRequired: 1, coinPrice: 35, imageUrl: "star", rarity: StoreItemRarity.COMMON },
  { name: "Triangle", category: StoreItemCategory.DECORATIONS, levelRequired: 1, coinPrice: 40, imageUrl: "triangle", rarity: StoreItemRarity.COMMON },
  { name: "Stripes", category: StoreItemCategory.DECORATIONS, levelRequired: 1, coinPrice: 45, imageUrl: "layers", rarity: StoreItemRarity.COMMON },
  { name: "Pillow", category: StoreItemCategory.DECORATIONS, levelRequired: 3, coinPrice: 110, imageUrl: "sofa", rarity: StoreItemRarity.RARE },
  { name: "Carrots", category: StoreItemCategory.DECORATIONS, levelRequired: 3, coinPrice: 130, imageUrl: "carrot", rarity: StoreItemRarity.RARE },
  { name: "Fish", category: StoreItemCategory.DECORATIONS, levelRequired: 3, coinPrice: 150, imageUrl: "fish", rarity: StoreItemRarity.RARE },
  { name: "Straw", category: StoreItemCategory.DECORATIONS, levelRequired: 5, coinPrice: 250, imageUrl: "wheat", rarity: StoreItemRarity.RARE },
  { name: "Water", category: StoreItemCategory.DECORATIONS, levelRequired: 1, coinPrice: 55, imageUrl: "droplet", rarity: StoreItemRarity.COMMON },
  { name: "Savannah", category: StoreItemCategory.DECORATIONS, levelRequired: 7, coinPrice: 450, imageUrl: "mountain", rarity: StoreItemRarity.EPIC },
  { name: "Mona Lisa (fox logo)", category: StoreItemCategory.DECORATIONS, levelRequired: 20, coinPrice: 3200, imageUrl: "image", rarity: StoreItemRarity.LEGENDARY },
  { name: "Starry night", category: StoreItemCategory.DECORATIONS, levelRequired: 20, coinPrice: 3400, imageUrl: "moon-star", rarity: StoreItemRarity.LEGENDARY },
  { name: "Gradient", category: StoreItemCategory.DECORATIONS, levelRequired: 1, coinPrice: 50, imageUrl: "palette", rarity: StoreItemRarity.COMMON },
  { name: "Flowers", category: StoreItemCategory.DECORATIONS, levelRequired: 5, coinPrice: 220, imageUrl: "flower", rarity: StoreItemRarity.RARE },
  { name: "Trees", category: StoreItemCategory.DECORATIONS, levelRequired: 7, coinPrice: 500, imageUrl: "trees", rarity: StoreItemRarity.EPIC },
  { name: "Chicken legs", category: StoreItemCategory.DECORATIONS, levelRequired: 10, coinPrice: 1100, imageUrl: "drumstick", rarity: StoreItemRarity.EPIC },
];

/**
 * PRO-09 — the achievement catalogue. `Achievement`'s own doc comment
 * (INF-19) notes the design draws badge tiles but names none of them, so
 * this is the source for what they actually are: one badge per criterion
 * type the schema's example already sketches, with thresholds taken
 * straight from that same example rather than invented fresh.
 *
 * `key` is `@unique`, so — unlike `StoreItem`'s name-based lookup above —
 * this seeds with a real `upsert`.
 */
const achievements: Array<{
  key: string;
  name: string;
  description: string;
  criteria: AchievementCriterion;
}> = [
  {
    key: "task_champion",
    name: "Task Champion",
    description: "Complete 10 tasks.",
    criteria: { type: "TASKS_COMPLETED", threshold: 10 },
  },
  {
    key: "rising_star",
    name: "Rising Star",
    description: "Reach Level 5.",
    criteria: { type: "LEVEL_REACHED", threshold: 5 },
  },
  {
    key: "week_warrior",
    name: "Week Warrior",
    description: "Keep a 7-day streak.",
    criteria: { type: "STREAK_DAYS", threshold: 7 },
  },
  {
    key: "first_purchase",
    name: "First Purchase",
    description: "Buy your first item from the store.",
    criteria: { type: "ITEMS_PURCHASED", threshold: 1 },
  },
];

async function main() {
  for (const item of catalogue) {
    // Matched on name + category (GACHA-03) — name alone would collapse the
    // catalogue's two "Fish" and two "Carrots" rows (one Food, one
    // Decorations each) onto a single row.
    const existing = await prisma.storeItem.findFirst({
      where: { name: item.name, category: item.category },
      select: { id: true },
    });

    if (existing) {
      await prisma.storeItem.update({ where: { id: existing.id }, data: item });
    } else {
      await prisma.storeItem.create({ data: item });
    }
  }
  console.log(`Seeded ${catalogue.length} StoreItem rows.`);

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    });
  }
  console.log(`Seeded ${achievements.length} Achievement rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
