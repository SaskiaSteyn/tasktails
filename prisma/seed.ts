import { StoreItemCategory, StoreItemRarity } from "@/generated/prisma/client";
import type { AchievementCriterion } from "@/lib/achievements";
import { prisma } from "@/lib/prisma";

/**
 * INF-20 — populates `StoreItem` with the catalogue documented in
 * `design_handoff/`. Nothing else in the store module writes `StoreItem`
 * rows (see the AGENTS.md note on INF-20), so this is the single source for
 * them.
 *
 * `imageUrl` is a real file path wherever artwork exists and a lucide-react
 * icon name otherwise; `hasRealArt()` in `item-visual.tsx` tells the two
 * apart, for every category. As of the 2026-08-23 art pack that leaves FOOD
 * (10 rows) as the only icon-name rows in the catalogue — every animal
 * points at `public/animals/happy/`, every accessory at
 * `public/accessories/`, and every decoration at `public/backgrounds/`.
 *
 * Animals and accessories are drawn on one shared 1080×1400 canvas so an
 * accessory layers onto an animal with no adjustment; `src/lib/pet-art.ts`
 * owns what that means for rendering (the sad cut of each species, the
 * collar's narrow variant, and the content boxes thumbnails crop to).
 *
 * Idempotent: looks up by `name` + `category` before writing, so re-running
 * the seed updates the existing row instead of duplicating it. Neither field
 * is a unique constraint in the schema (INF-04) — enforcing that is out of
 * scope here — so this checks in application code rather than using
 * `upsert`. Matching needs *both* fields, not `name` alone (GACHA-03): the
 * catalogue below has two same-named-but-different items — "Fish" is both a
 * Food item (220 coins) and a Decoration (150 coins) — and a name-only
 * lookup would collapse them onto one row.
 *
 * **GACHA-03 (2026-08-07)** expanded the catalogue toward *Gatcha
 * stuffs.pdf*'s full 68-item roster (22 animals, 16 decorations, 10 food, 20
 * accessories) and added `rarity` (`StoreItemRarity`, from `GACHA-01`) — six
 * of INF-20's original 7 items turned out to already match a PDF row on
 * level/price and were left in place under their existing names rather than
 * renamed to match the PDF exactly: "Sunflower seeds" = PDF "Seed" (Food),
 * "Red collar" = "Collar" (Accessories), "Treat box" = "Carrots" (Food),
 * "Koala kit"/"Fox kit"/"Penguin kit" = PDF "Koala"/"Fox"/"Penguin"
 * (Animals). The seventh, "Cosy den" (Decorations, 280 coins), had no PDF
 * match at any level/price and was dropped entirely on 2026-08-24 (#207)
 * rather than kept as a fabricated, art-less catalogue row — see the
 * `removals` array below. **PRO-18 (2026-08-10)** added the remaining 19
 * animals (icon-fallback artwork) so "own every animal" achievements have
 * the real catalogue to target. **2026-08-23** added Hedgehog, the one
 * species in the art pack with no PDF row at all — 70 items, 23 animals.
 *
 * **`levelRequired` remapped 2026-08-11 (issue #160 — "too easy to gain xp
 * and level up")**, per `design_handoff/ADDENDUM-xp-curve.md`. Every item
 * below now carries the level from that addendum's per-category tables,
 * spread cheapest-first across four 5-level rarity bands (Common 1–5, Rare
 * 6–10, Epic 11–15, Legendary 16–20) against the new 20-level XP curve in
 * `src/lib/levels.ts`. This retires the earlier design where Koala/Fox/
 * Penguin were the only three animals seeded and Fox (Lvl 7) / Penguin
 * (Lvl 10) specifically were pinned to the study's old "second/third animal
 * type" exposure timing — all 22 animals are now spread through the curve
 * like every other category (Johan, 2026-08-11), and nothing here is
 * special-cased by name any more.
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
    levelRequired: 2,
    coinPrice: 40,
    imageUrl: "wheat",
    rarity: StoreItemRarity.COMMON, // = PDF "Seed"
  },
  {
    name: "Red collar",
    category: StoreItemCategory.ACCESSORIES,
    levelRequired: 5,
    coinPrice: 65,
    imageUrl: "/accessories/collar-wide.svg",
    rarity: StoreItemRarity.COMMON, // = PDF "Collar"
  },
  {
    name: "Treat box",
    category: StoreItemCategory.FOOD,
    levelRequired: 6,
    coinPrice: 120,
    imageUrl: "package",
    rarity: StoreItemRarity.RARE, // = PDF "Carrots" (Food)
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
    // animal is the onboarding runway and is priced to clear it, on the
    // user's call (2026-07-29). `levelRequired` here is unrelated — Koala
    // is Common tier's cheapest animal either way, so it lands at Level 1
    // under the 2026-08-11 remap regardless of price.
    name: "Koala kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 1,
    coinPrice: 5,
    imageUrl: "/animals/happy/koala.svg",
    rarity: StoreItemRarity.COMMON, // = PDF "Koala" ("Common*")
  },
  {
    name: "Fox kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 12,
    coinPrice: 550,
    imageUrl: "/animals/happy/fox.svg",
    rarity: StoreItemRarity.EPIC, // = PDF "Fox"
  },
  {
    name: "Penguin kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 15,
    coinPrice: 1200,
    imageUrl: "/animals/happy/penguin.svg",
    rarity: StoreItemRarity.EPIC, // = PDF "Penguin"
  },

  // ---- PRO-18 (2026-08-10): the remaining 19 animals from Gatcha stuffs.pdf's
  // Animals table, completing the real 22-item catalogue "own every animal"
  // achievements target. These seeded with a shared `"paw-print"` icon
  // fallback for as long as no artwork existed for them; the 2026-08-23 art
  // pack drew all 22 (plus Hedgehog, below), so every row here now points at
  // its own file. `levelRequired` for every animal in this file is the
  // 2026-08-11 remap from ADDENDUM-xp-curve.md, not the PDF's own numbers —
  // see the file doc comment.
  //
  // Four files are spelled for the artist's own naming, not the catalogue's:
  // `axlotl` (Axolotl), `cappybara` (Capybara), `otter` (Otters) and `hyrax`
  // (Dassie — the same animal under its other name). Renaming the assets to
  // match would have been the tidier half of the trade and the riskier one:
  // `ART_FOCUS` in `src/lib/pet-art.ts` and every sad-cut filename key off
  // these stems too.
  { name: "Lion kit", category: StoreItemCategory.ANIMALS, levelRequired: 11, coinPrice: 480, imageUrl: "/animals/happy/lion.svg", rarity: StoreItemRarity.EPIC },
  { name: "Bunny kit", category: StoreItemCategory.ANIMALS, levelRequired: 2, coinPrice: 35, imageUrl: "/animals/happy/bunny.svg", rarity: StoreItemRarity.COMMON },
  { name: "Jaguar kit", category: StoreItemCategory.ANIMALS, levelRequired: 13, coinPrice: 620, imageUrl: "/animals/happy/jaguar.svg", rarity: StoreItemRarity.EPIC },
  { name: "Tiger kit", category: StoreItemCategory.ANIMALS, levelRequired: 14, coinPrice: 1000, imageUrl: "/animals/happy/tiger.svg", rarity: StoreItemRarity.EPIC },
  { name: "Monkey kit", category: StoreItemCategory.ANIMALS, levelRequired: 7, coinPrice: 170, imageUrl: "/animals/happy/monkey.svg", rarity: StoreItemRarity.RARE },
  { name: "Giraffe kit", category: StoreItemCategory.ANIMALS, levelRequired: 6, coinPrice: 130, imageUrl: "/animals/happy/giraffe.svg", rarity: StoreItemRarity.RARE },
  { name: "Elephant kit", category: StoreItemCategory.ANIMALS, levelRequired: 15, coinPrice: 1400, imageUrl: "/animals/happy/elephant.svg", rarity: StoreItemRarity.EPIC },
  { name: "Donkey kit", category: StoreItemCategory.ANIMALS, levelRequired: 3, coinPrice: 45, imageUrl: "/animals/happy/donkey.svg", rarity: StoreItemRarity.COMMON },
  { name: "Ostrich kit", category: StoreItemCategory.ANIMALS, levelRequired: 7, coinPrice: 190, imageUrl: "/animals/happy/ostrich.svg", rarity: StoreItemRarity.RARE },
  { name: "Otters kit", category: StoreItemCategory.ANIMALS, levelRequired: 5, coinPrice: 65, imageUrl: "/animals/happy/otter.svg", rarity: StoreItemRarity.COMMON },
  { name: "Rhino kit", category: StoreItemCategory.ANIMALS, levelRequired: 18, coinPrice: 3000, imageUrl: "/animals/happy/rhino.svg", rarity: StoreItemRarity.LEGENDARY },
  { name: "Panda kit", category: StoreItemCategory.ANIMALS, levelRequired: 20, coinPrice: 3500, imageUrl: "/animals/happy/panda.svg", rarity: StoreItemRarity.LEGENDARY },
  { name: "Zebra kit", category: StoreItemCategory.ANIMALS, levelRequired: 6, coinPrice: 150, imageUrl: "/animals/happy/zebra.svg", rarity: StoreItemRarity.RARE },
  { name: "Flamingo kit", category: StoreItemCategory.ANIMALS, levelRequired: 8, coinPrice: 230, imageUrl: "/animals/happy/flamingo.svg", rarity: StoreItemRarity.RARE },
  { name: "Axolotl kit", category: StoreItemCategory.ANIMALS, levelRequired: 8, coinPrice: 260, imageUrl: "/animals/happy/axlotl.svg", rarity: StoreItemRarity.RARE },
  { name: "Dassie kit", category: StoreItemCategory.ANIMALS, levelRequired: 5, coinPrice: 75, imageUrl: "/animals/happy/hyrax.svg", rarity: StoreItemRarity.COMMON },
  { name: "Platypus kit", category: StoreItemCategory.ANIMALS, levelRequired: 9, coinPrice: 300, imageUrl: "/animals/happy/platypus.svg", rarity: StoreItemRarity.RARE },
  { name: "Tortoise kit", category: StoreItemCategory.ANIMALS, levelRequired: 4, coinPrice: 55, imageUrl: "/animals/happy/tortoise.svg", rarity: StoreItemRarity.COMMON },
  { name: "Capybara kit", category: StoreItemCategory.ANIMALS, levelRequired: 10, coinPrice: 340, imageUrl: "/animals/happy/cappybara.svg", rarity: StoreItemRarity.RARE },

  // ---- 2026-08-23: the 23rd species. Hedgehog is the one animal in the art
  // pack with no row in Gatcha stuffs.pdf, so it has no PDF level or price to
  // inherit and none was specified — rolled at random within the existing
  // scheme rather than invented free-hand, which is what keeps it from
  // distorting the curve: Rare band, so `levelRequired` had to land in 6–10
  // (ADDENDUM-xp-curve.md's Rare window) and `coinPrice` between the band's
  // cheapest and dearest animals (Monkey 170, Capybara 340). Landing on
  // level 9 alongside Platypus is fine — Otters/Dassie and Monkey/Ostrich
  // already share their levels too.
  //
  // Every "own every animal" achievement targets the live catalogue count
  // (`catalogueItemCounts()` in `src/lib/store.ts`) rather than a baked-in
  // 22, so adding this row raises the bar for `unlock_all_animals` and
  // `zoo_adopt_all` on its own, with no achievement edit needed. Any account
  // that had already earned either keeps it: PRO-18's evaluation only ever
  // grants.
  { name: "Hedgehog kit", category: StoreItemCategory.ANIMALS, levelRequired: 9, coinPrice: 280, imageUrl: "/animals/happy/hedgehog.svg", rarity: StoreItemRarity.RARE },

  // ---- GACHA-03: the rest of Gatcha stuffs.pdf's Food table. levelRequired
  // is the 2026-08-11 remap (ADDENDUM-xp-curve.md), not the PDF's own numbers.
  { name: "Steak", category: StoreItemCategory.FOOD, levelRequired: 13, coinPrice: 480, imageUrl: "beef", rarity: StoreItemRarity.EPIC },
  { name: "Chicken", category: StoreItemCategory.FOOD, levelRequired: 8, coinPrice: 150, imageUrl: "drumstick", rarity: StoreItemRarity.RARE },
  { name: "Hay", category: StoreItemCategory.FOOD, levelRequired: 1, coinPrice: 30, imageUrl: "wheat", rarity: StoreItemRarity.COMMON },
  { name: "Fish", category: StoreItemCategory.FOOD, levelRequired: 10, coinPrice: 220, imageUrl: "fish", rarity: StoreItemRarity.RARE },
  { name: "Lettuce", category: StoreItemCategory.FOOD, levelRequired: 3, coinPrice: 45, imageUrl: "leafy-green", rarity: StoreItemRarity.COMMON },
  { name: "Branch", category: StoreItemCategory.FOOD, levelRequired: 4, coinPrice: 50, imageUrl: "sprout", rarity: StoreItemRarity.COMMON },
  { name: "Shrimp", category: StoreItemCategory.FOOD, levelRequired: 15, coinPrice: 950, imageUrl: "shrimp", rarity: StoreItemRarity.EPIC },
  { name: "Bananas", category: StoreItemCategory.FOOD, levelRequired: 11, coinPrice: 420, imageUrl: "banana", rarity: StoreItemRarity.EPIC },

  // ---- GACHA-03: the rest of Gatcha stuffs.pdf's Accessories table.
  // Hats and ties used to share one loose-fit lucide glyph each; the
  // 2026-08-23 art pack drew all 20, so every row points at its own file and
  // an accessory now paints onto the animal itself rather than standing in as
  // a badge beside it. levelRequired is the 2026-08-11 remap
  // (ADDENDUM-xp-curve.md).
  //
  // Two of these are *different items* from what they were, not re-drawings:
  // "Harry Potter glasses" became "Moustache" and "Oversized sunglasses"
  // became "Mandarin", at the user's request. Both keep their predecessor's
  // level, price and rarity — nothing about the curve changed, only the
  // thing being sold — and `renames` below moves the existing DB row over so
  // an account that already bought one keeps it (under its new identity)
  // instead of the seed stranding it as a duplicate.
  //
  // "Red collar" is one item with two files: `collar-wide` (seeded here, the
  // default) and `collar-small`, which `accessoryArtUrl()` in
  // `src/lib/pet-art.ts` swaps in when it's worn on a giraffe or an ostrich.
  // That's a property of the animal, not of the purchase, so it stays out of
  // the catalogue.
  { name: "Fedora hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 6, coinPrice: 130, imageUrl: "/accessories/fedora.svg", rarity: StoreItemRarity.RARE },
  { name: "Baller hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 9, coinPrice: 240, imageUrl: "/accessories/bawler.svg", rarity: StoreItemRarity.RARE },
  { name: "Cowboy hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 10, coinPrice: 280, imageUrl: "/accessories/cowboy.svg", rarity: StoreItemRarity.RARE },
  { name: "Top hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 11, coinPrice: 480, imageUrl: "/accessories/top-hat.svg", rarity: StoreItemRarity.EPIC },
  { name: "Pirate hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 12, coinPrice: 550, imageUrl: "/accessories/pirate.svg", rarity: StoreItemRarity.EPIC },
  { name: "Jester hat", category: StoreItemCategory.ACCESSORIES, levelRequired: 10, coinPrice: 320, imageUrl: "/accessories/jester.svg", rarity: StoreItemRarity.RARE },
  { name: "Plain tie (red)", category: StoreItemCategory.ACCESSORIES, levelRequired: 1, coinPrice: 35, imageUrl: "/accessories/tie-red.svg", rarity: StoreItemRarity.COMMON },
  { name: "Stripe tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 2, coinPrice: 40, imageUrl: "/accessories/tie-blue.svg", rarity: StoreItemRarity.COMMON },
  { name: "Bow tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 2, coinPrice: 45, imageUrl: "/accessories/tie-bow.svg", rarity: StoreItemRarity.COMMON },
  { name: "Heart tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 3, coinPrice: 50, imageUrl: "/accessories/tie-hearts.svg", rarity: StoreItemRarity.COMMON },
  { name: "Stars tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 4, coinPrice: 55, imageUrl: "/accessories/tie-stars.svg", rarity: StoreItemRarity.COMMON },
  { name: "Gingham tie", category: StoreItemCategory.ACCESSORIES, levelRequired: 5, coinPrice: 60, imageUrl: "/accessories/tie-gingham.svg", rarity: StoreItemRarity.COMMON },
  { name: "Running sunglasses", category: StoreItemCategory.ACCESSORIES, levelRequired: 7, coinPrice: 170, imageUrl: "/accessories/glasses-running.svg", rarity: StoreItemRarity.RARE },
  { name: "Reading glasses", category: StoreItemCategory.ACCESSORIES, levelRequired: 6, coinPrice: 150, imageUrl: "/accessories/glasses-reading.svg", rarity: StoreItemRarity.RARE },
  { name: "Aviators", category: StoreItemCategory.ACCESSORIES, levelRequired: 14, coinPrice: 1000, imageUrl: "/accessories/glasses-aviators.svg", rarity: StoreItemRarity.EPIC },
  { name: "Moustache", category: StoreItemCategory.ACCESSORIES, levelRequired: 16, coinPrice: 2800, imageUrl: "/accessories/moustache.svg", rarity: StoreItemRarity.LEGENDARY },
  { name: "Mandarin", category: StoreItemCategory.ACCESSORIES, levelRequired: 8, coinPrice: 190, imageUrl: "/accessories/mandarin.svg", rarity: StoreItemRarity.RARE },
  { name: "Flower crown", category: StoreItemCategory.ACCESSORIES, levelRequired: 15, coinPrice: 1300, imageUrl: "/accessories/flower-crown.svg", rarity: StoreItemRarity.EPIC },
  { name: "Crown", category: StoreItemCategory.ACCESSORIES, levelRequired: 20, coinPrice: 3800, imageUrl: "/accessories/crown.svg", rarity: StoreItemRarity.LEGENDARY },

  // ---- GACHA-03: the rest of Gatcha stuffs.pdf's Decor table. levelRequired
  // is the 2026-08-11 remap (ADDENDUM-xp-curve.md), not the PDF's own numbers.
  //
  // `imageUrl` for all 16 now points at real background art in
  // `public/backgrounds/` rather than a lucide icon name — these decorations
  // double as a pet's equippable stage background (see `equippedBackgroundsForUser()`
  // in `src/lib/inventory.ts`), not just a store icon, so real artwork exists
  // for every one of them.
  //
  // Seven rows were renamed 2026-08-16 to match a reworked asset pack (small
  // repeatable tile patterns, replacing the original single-scene SVGs):
  // "Pillow" -> "Sprinkles", "Straw" -> "Bows", "Savannah" -> "Rainbow",
  // "Mona Lisa (fox logo)" -> "Gingham", "Starry night" -> "Retro",
  // "Gradient" -> "Maze", "Trees" -> "Squiggles" — `name` and `imageUrl`
  // both changed together so every row's display name matches its own file
  // again. **Renaming `name` here alone does not rename the existing DB
  // row** — this file's own header comment documents the seed's lookup as
  // `name` + `category`, so a changed `name` makes a re-run `create` a new
  // row instead of updating the old one, stranding the old-named row as a
  // duplicate. The six pre-existing rows were renamed in place directly in
  // Postgres before re-running this seed, specifically to avoid that; a
  // fresh database has no such duplicate to worry about (2026-08-24, #207:
  // that fix never reached the `renames` array below, so it only covered the
  // one database it was done on by hand — added retroactively). `Chicken
  // legs` (-> chicken.svg) still keeps its own name despite the same
  // name/asset mismatch, since it wasn't part of either rename request.
  { name: "Hearts", category: StoreItemCategory.DECORATIONS, levelRequired: 1, coinPrice: 30, imageUrl: "/backgrounds/hearts.svg", rarity: StoreItemRarity.COMMON },
  { name: "Stars", category: StoreItemCategory.DECORATIONS, levelRequired: 2, coinPrice: 35, imageUrl: "/backgrounds/stars.svg", rarity: StoreItemRarity.COMMON },
  { name: "Triangle", category: StoreItemCategory.DECORATIONS, levelRequired: 3, coinPrice: 40, imageUrl: "/backgrounds/triangles.svg", rarity: StoreItemRarity.COMMON },
  { name: "Stripes", category: StoreItemCategory.DECORATIONS, levelRequired: 4, coinPrice: 45, imageUrl: "/backgrounds/stripes.svg", rarity: StoreItemRarity.COMMON },
  { name: "Sprinkles", category: StoreItemCategory.DECORATIONS, levelRequired: 6, coinPrice: 110, imageUrl: "/backgrounds/sprinkles.svg", rarity: StoreItemRarity.RARE },
  { name: "Carrots", category: StoreItemCategory.DECORATIONS, levelRequired: 7, coinPrice: 130, imageUrl: "/backgrounds/carrots.svg", rarity: StoreItemRarity.RARE },
  { name: "Fish", category: StoreItemCategory.DECORATIONS, levelRequired: 8, coinPrice: 150, imageUrl: "/backgrounds/fish.svg", rarity: StoreItemRarity.RARE },
  { name: "Bows", category: StoreItemCategory.DECORATIONS, levelRequired: 10, coinPrice: 250, imageUrl: "/backgrounds/bows.svg", rarity: StoreItemRarity.RARE },
  { name: "Water", category: StoreItemCategory.DECORATIONS, levelRequired: 5, coinPrice: 55, imageUrl: "/backgrounds/water.svg", rarity: StoreItemRarity.COMMON },
  { name: "Rainbow", category: StoreItemCategory.DECORATIONS, levelRequired: 11, coinPrice: 450, imageUrl: "/backgrounds/rainbow.svg", rarity: StoreItemRarity.EPIC },
  { name: "Gingham", category: StoreItemCategory.DECORATIONS, levelRequired: 17, coinPrice: 3200, imageUrl: "/backgrounds/gingham.svg", rarity: StoreItemRarity.LEGENDARY },
  { name: "Retro", category: StoreItemCategory.DECORATIONS, levelRequired: 19, coinPrice: 3400, imageUrl: "/backgrounds/retro.svg", rarity: StoreItemRarity.LEGENDARY },
  { name: "Maze", category: StoreItemCategory.DECORATIONS, levelRequired: 5, coinPrice: 50, imageUrl: "/backgrounds/maze.svg", rarity: StoreItemRarity.COMMON },
  { name: "Flowers", category: StoreItemCategory.DECORATIONS, levelRequired: 9, coinPrice: 220, imageUrl: "/backgrounds/flowers.svg", rarity: StoreItemRarity.RARE },
  { name: "Squiggles", category: StoreItemCategory.DECORATIONS, levelRequired: 13, coinPrice: 500, imageUrl: "/backgrounds/squiggles.svg", rarity: StoreItemRarity.EPIC },
  { name: "Chicken legs", category: StoreItemCategory.DECORATIONS, levelRequired: 15, coinPrice: 1100, imageUrl: "/backgrounds/chicken.svg", rarity: StoreItemRarity.EPIC },
];

/**
 * PRO-18 — the achievement catalogue: all 38 achievements from the approved
 * `Beta/Planning/Achievements.pdf` (Streaks/Unlocks/Tasks/Petting Zoo),
 * replacing PRO-09's original 4 invented placeholders (`task_champion`,
 * `rising_star`, `week_warrior`, `first_purchase`) at the project owner's
 * direction — those don't map onto the PDF's 4 categories, and the ones
 * that overlapped in spirit (a task count, a streak) already exist here in
 * the PDF's own form. `xpReward` values are the PDF's seeded figures; see
 * that document's own closing notes for how each tier was derived
 * (unlocks scale by rarity, tasks by economy_system.md's tier table,
 * streaks compounding, "own everything" as the single largest award).
 *
 * `key` is `@unique`, so — unlike `StoreItem`'s name-based lookup above —
 * this seeds with a real `upsert`.
 */
const achievements: Array<{
  key: string;
  name: string;
  description: string;
  criteria: AchievementCriterion;
  xpReward: number;
}> = [
  // Streaks
  { key: "streak_5_day", name: "On a Roll", description: "Keep a 5-day task streak.", criteria: { type: "STREAK_DAYS", threshold: 5 }, xpReward: 50 },
  { key: "streak_7_day", name: "Week Warrior", description: "Keep a 7-day task streak.", criteria: { type: "STREAK_DAYS", threshold: 7 }, xpReward: 75 },
  { key: "streak_14_day", name: "Fortnight Fanatic", description: "Keep a 14-day task streak.", criteria: { type: "STREAK_DAYS", threshold: 14 }, xpReward: 150 },
  { key: "streak_30_day", name: "Unstoppable", description: "Keep a 30-day task streak.", criteria: { type: "STREAK_DAYS", threshold: 30 }, xpReward: 400 },

  // Unlocks — rarity x category
  { key: "unlock_common_animal", name: "Common Find", description: "Own a Common animal.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ANIMALS, rarity: StoreItemRarity.COMMON }, xpReward: 15 },
  { key: "unlock_common_decor", name: "Common Touch", description: "Own a Common decoration.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.DECORATIONS, rarity: StoreItemRarity.COMMON }, xpReward: 15 },
  { key: "unlock_common_food", name: "Common Snack", description: "Own a Common food item.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.FOOD, rarity: StoreItemRarity.COMMON }, xpReward: 15 },
  { key: "unlock_common_accessory", name: "Common Style", description: "Own a Common accessory.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ACCESSORIES, rarity: StoreItemRarity.COMMON }, xpReward: 15 },
  { key: "unlock_rare_animal", name: "Rare Find", description: "Own a Rare animal.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ANIMALS, rarity: StoreItemRarity.RARE }, xpReward: 40 },
  { key: "unlock_rare_decor", name: "Rare Touch", description: "Own a Rare decoration.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.DECORATIONS, rarity: StoreItemRarity.RARE }, xpReward: 40 },
  { key: "unlock_rare_food", name: "Rare Snack", description: "Own a Rare food item.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.FOOD, rarity: StoreItemRarity.RARE }, xpReward: 40 },
  { key: "unlock_rare_accessory", name: "Rare Style", description: "Own a Rare accessory.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ACCESSORIES, rarity: StoreItemRarity.RARE }, xpReward: 40 },
  { key: "unlock_epic_animal", name: "Epic Find", description: "Own an Epic animal.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ANIMALS, rarity: StoreItemRarity.EPIC }, xpReward: 100 },
  { key: "unlock_epic_decor", name: "Epic Touch", description: "Own an Epic decoration.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.DECORATIONS, rarity: StoreItemRarity.EPIC }, xpReward: 100 },
  { key: "unlock_epic_food", name: "Epic Snack", description: "Own an Epic food item.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.FOOD, rarity: StoreItemRarity.EPIC }, xpReward: 100 },
  { key: "unlock_epic_accessory", name: "Epic Style", description: "Own an Epic accessory.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ACCESSORIES, rarity: StoreItemRarity.EPIC }, xpReward: 100 },
  { key: "unlock_legendary_animal", name: "Legendary Find", description: "Own a Legendary animal.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ANIMALS, rarity: StoreItemRarity.LEGENDARY }, xpReward: 250 },
  { key: "unlock_legendary_decor", name: "Legendary Touch", description: "Own a Legendary decoration.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.DECORATIONS, rarity: StoreItemRarity.LEGENDARY }, xpReward: 250 },
  { key: "unlock_legendary_food", name: "Legendary Snack", description: "Own a Legendary food item.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.FOOD, rarity: StoreItemRarity.LEGENDARY }, xpReward: 250 },
  { key: "unlock_legendary_accessory", name: "Legendary Style", description: "Own a Legendary accessory.", criteria: { type: "RARITY_OWNED", category: StoreItemCategory.ACCESSORIES, rarity: StoreItemRarity.LEGENDARY }, xpReward: 250 },

  // Unlocks — full category / full store
  { key: "unlock_all_animals", name: "Menagerie", description: "Own every animal in the catalogue.", criteria: { type: "CATEGORY_FULLY_OWNED", category: StoreItemCategory.ANIMALS }, xpReward: 300 },
  { key: "unlock_all_decor", name: "Interior Designer", description: "Own every decoration in the catalogue.", criteria: { type: "CATEGORY_FULLY_OWNED", category: StoreItemCategory.DECORATIONS }, xpReward: 200 },
  { key: "unlock_all_food", name: "Full Pantry", description: "Own every food item in the catalogue.", criteria: { type: "CATEGORY_FULLY_OWNED", category: StoreItemCategory.FOOD }, xpReward: 150 },
  { key: "unlock_all_accessories", name: "Fully Accessorized", description: "Own every accessory in the catalogue.", criteria: { type: "CATEGORY_FULLY_OWNED", category: StoreItemCategory.ACCESSORIES }, xpReward: 200 },
  { key: "unlock_everything", name: "Completionist", description: "Own every item in the store.", criteria: { type: "ALL_ITEMS_OWNED" }, xpReward: 1000 },

  // Tasks
  { key: "tasks_3_in_day", name: "Quick Start", description: "Complete 3 tasks in one day.", criteria: { type: "TASKS_COMPLETED_IN_DAY", threshold: 3 }, xpReward: 25 },
  { key: "tasks_5_in_day", name: "Getting Things Done", description: "Complete 5 tasks in one day.", criteria: { type: "TASKS_COMPLETED_IN_DAY", threshold: 5 }, xpReward: 50 },
  { key: "tasks_10_in_day", name: "Productivity Machine", description: "Complete 10 tasks in one day.", criteria: { type: "TASKS_COMPLETED_IN_DAY", threshold: 10 }, xpReward: 120 },
  { key: "tasks_one_of_each", name: "Well Rounded", description: "Complete one task of every complexity tier.", criteria: { type: "TASK_TIER_VARIETY" }, xpReward: 80 },
  { key: "tasks_10_trivial", name: "Small Steps", description: "Complete 10 Trivial tasks.", criteria: { type: "TASKS_COMPLETED_BY_TIER", tier: 1, threshold: 10 }, xpReward: 40 },
  { key: "tasks_10_small", name: "Steady Progress", description: "Complete 10 Small tasks.", criteria: { type: "TASKS_COMPLETED_BY_TIER", tier: 2, threshold: 10 }, xpReward: 100 },
  { key: "tasks_10_medium", name: "Solid Effort", description: "Complete 10 Medium tasks.", criteria: { type: "TASKS_COMPLETED_BY_TIER", tier: 3, threshold: 10 }, xpReward: 200 },
  { key: "tasks_10_large", name: "Heavy Lifter", description: "Complete 10 Large tasks.", criteria: { type: "TASKS_COMPLETED_BY_TIER", tier: 4, threshold: 10 }, xpReward: 400 },
  { key: "tasks_10_epic", name: "Legend in the Making", description: "Complete 10 Epic tasks.", criteria: { type: "TASKS_COMPLETED_BY_TIER", tier: 5, threshold: 10 }, xpReward: 750 },

  // Petting Zoo
  { key: "zoo_pet_50", name: "Gentle Hands", description: "Pet animals 50 times.", criteria: { type: "PET_INTERACTIONS", threshold: 50 }, xpReward: 60 },
  { key: "zoo_feed_50", name: "Caretaker", description: "Feed animals 50 times.", criteria: { type: "FEED_INTERACTIONS", threshold: 50 }, xpReward: 60 },
  { key: "zoo_best_friend", name: "Nature's Best Friend", description: "Pet every type of animal you own.", criteria: { type: "ANIMAL_VARIETY_PETTED" }, xpReward: 100 },
  { key: "zoo_adopt_all", name: "Full House", description: "Adopt every type of animal.", criteria: { type: "ANIMAL_VARIETY_OWNED" }, xpReward: 250 },
];

/**
 * Catalogue rows whose `name` changed, so an existing database follows the
 * rename instead of growing a duplicate.
 *
 * This file's lookup is `name` + `category` (see the doc comment), which
 * means a renamed row reads as a row that doesn't exist yet: the seed would
 * `create` the new name and leave the old one behind, still owned, still
 * equipped, still counting toward "own every accessory".
 *
 * Deliberately not a `deleteMany` of unknown names, the way the achievements
 * below are pruned: a `StoreItem` is referenced by `InventoryItem`,
 * `CartItem`, `Transaction` and `Pet`, so dropping one would take a
 * participant's purchase history with it.
 */
const renames: Array<{ from: string; to: string; category: StoreItemCategory }> = [
  // 2026-08-16, with the reworked pattern-tile asset pack — the seven
  // renamed decorations (issue #207, "old background names"). This array
  // didn't exist yet when that rename shipped, so it only reached the
  // database it was made on (fixed there by hand); every other database
  // seeded before 2026-08-16 and reseeded since has both names live side by
  // side, e.g. "Pillow" and "Sprinkles" both showing as Level 6 Rare
  // decorations. Added here now so re-seeding heals it instead of requiring
  // the same by-hand fix on every affected database.
  { from: "Pillow", to: "Sprinkles", category: StoreItemCategory.DECORATIONS },
  { from: "Straw", to: "Bows", category: StoreItemCategory.DECORATIONS },
  { from: "Savannah", to: "Rainbow", category: StoreItemCategory.DECORATIONS },
  { from: "Mona Lisa (fox logo)", to: "Gingham", category: StoreItemCategory.DECORATIONS },
  { from: "Starry night", to: "Retro", category: StoreItemCategory.DECORATIONS },
  { from: "Gradient", to: "Maze", category: StoreItemCategory.DECORATIONS },
  { from: "Trees", to: "Squiggles", category: StoreItemCategory.DECORATIONS },
  // 2026-08-23, with the art pack — the two swapped accessories.
  { from: "Harry Potter glasses", to: "Moustache", category: StoreItemCategory.ACCESSORIES },
  { from: "Oversized sunglasses", to: "Mandarin", category: StoreItemCategory.ACCESSORIES },
];

/**
 * Catalogue rows dropped entirely rather than renamed — deliberately
 * explicit and one at a time, never a blanket "delete anything not in
 * `catalogue`" pass the way stale achievements are pruned below: a
 * `StoreItem` is referenced by `InventoryItem`, `CartItem`, `Transaction` and
 * `Pet` (all `onDelete: Cascade`), so an automatic sweep could take a
 * participant's purchase history with it for a name that simply hasn't been
 * added to `catalogue` yet, not one the project owner actually asked gone.
 */
const removals: Array<{ name: string; category: StoreItemCategory }> = [
  // 2026-08-24 (#207) — "Cosy den" never had a PDF match at any level/price
  // (see the file doc comment) and, unlike every other DECORATIONS row, was
  // never drawn as real background art either. Dropped at the project
  // owner's direction rather than kept as the one fabricated, art-less row
  // in an otherwise-real catalogue.
  { name: "Cosy den", category: StoreItemCategory.DECORATIONS },
];

async function main() {
  // Before the catalogue loop, so the renamed rows are found by their new
  // name below and updated in place rather than duplicated.
  for (const { from, to, category } of renames) {
    const [old, current] = await Promise.all([
      prisma.storeItem.findFirst({ where: { name: from, category }, select: { id: true } }),
      prisma.storeItem.findFirst({ where: { name: to, category }, select: { id: true } }),
    ]);
    // Only when the new name isn't taken: on a re-run the old row is already
    // gone, and on a database where someone created the new name by hand,
    // merging two rows is not something a seed should decide.
    if (old && !current) {
      await prisma.storeItem.update({ where: { id: old.id }, data: { name: to } });
      console.log(`Renamed StoreItem "${from}" -> "${to}".`);
    }
  }

  for (const { name, category } of removals) {
    const { count } = await prisma.storeItem.deleteMany({ where: { name, category } });
    if (count > 0) console.log(`Removed StoreItem "${name}".`);
  }

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

  // PRO-18 — removes PRO-09's 4 placeholder achievements (`task_champion`
  // etc.), which no longer appear in the array above. Cascades to
  // `UserAchievement` via the existing `onDelete: Cascade` (INF-19) — any
  // account that had earned one of them loses that row, accepted per the
  // project owner's "replace entirely" call rather than keeping stale rows
  // upsert alone would never remove.
  const { count: removed } = await prisma.achievement.deleteMany({
    where: { key: { notIn: achievements.map((a) => a.key) } },
  });

  console.log(
    `Seeded ${achievements.length} Achievement rows (removed ${removed} stale).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
