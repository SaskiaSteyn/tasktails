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
 * roster. Only 3 animal types carry real artwork in `public/animals/` and
 * are priced/gated to match that design: Koala (Level 1 starter — the "Buy 1
 * animal" onboarding goal needs something purchasable immediately, and the
 * gate table's Level 1 row is the baseline tier everything else builds on),
 * Fox (Level 7 — "Fox kit"/"2nd animal"/"Unlocks at Lvl 7" is the Store
 * mock's own explicit label, taken over the README's looser "starter pet"
 * aside), and Penguin (Level 10, the remaining unused asset, as the third
 * type). **PRO-18 (2026-08-10) added the other 19** (icon-fallback
 * artwork, see the GACHA-03 note below) so "own every animal" achievements
 * have the real 22-item catalogue to target — the study's own urgency
 * pacing is unaffected, since those 19 aren't part of the Level 1/7/10 gate
 * story above.
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
 * The other 62 PDF items are net-new rows: 43 non-animal (8 food, 19
 * accessories, 16 decorations), plus — **added PRO-18, 2026-08-10** — the
 * remaining 19 animals this file used to leave out. Reason for the original
 * gap: `ItemWell` (`item-visual.tsx`) rendered every `ANIMALS`-category item
 * as `next/image` off `imageUrl` unconditionally, and only 3 species
 * (Koala/Fox/Penguin) have real SVGs in `public/animals/` — seeding the
 * other 19 would have 404'd across the Store, Pet customizer and feed
 * sheet. Resolved, not worked around: `ItemWell` and the three places that
 * render a pet's own art directly (`AnimalCard`, `ZooGalleryCard`,
 * `PetCustomizer`) now fall back to a lucide icon (`hasAnimalArt()` in
 * `item-visual.tsx` tells a real path from an icon-name fallback) — the
 * same "one shared icon, not literal artwork" precedent this file's own
 * hat/tie rows already use, all 19 sharing `"paw-print"`. Needed because
 * PRO-18's "own every animal" achievements (Menagerie, Full House) are
 * meant to target the real 22-animal catalogue, not the 3 that happened to
 * have art.
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

  // ---- PRO-18 (2026-08-10): the remaining 19 animals from Gatcha stuffs.pdf's
  // Animals table, completing the real 22-item catalogue "own every animal"
  // achievements target. No real SVG exists for any of these — `"paw-print"`
  // is the shared icon-fallback `imageUrl` every one of them uses (the same
  // "one shared icon, not literal artwork" precedent this file's hat/tie
  // rows already set), told apart from a real asset path by `hasAnimalArt()`
  // in `item-visual.tsx`. Level/price/rarity are the PDF's own numbers,
  // unlike the three real-art animals above, which are priced/gated to the
  // study's urgency-exposure design rather than the PDF — these 19 aren't
  // part of that story, so nothing here needed reconciling.
  { name: "Lion kit", category: StoreItemCategory.ANIMALS, levelRequired: 7, coinPrice: 480, imageUrl: "paw-print", rarity: StoreItemRarity.EPIC },
  { name: "Bunny kit", category: StoreItemCategory.ANIMALS, levelRequired: 1, coinPrice: 35, imageUrl: "paw-print", rarity: StoreItemRarity.COMMON },
  { name: "Jaguar kit", category: StoreItemCategory.ANIMALS, levelRequired: 7, coinPrice: 620, imageUrl: "paw-print", rarity: StoreItemRarity.EPIC },
  { name: "Tiger kit", category: StoreItemCategory.ANIMALS, levelRequired: 10, coinPrice: 1000, imageUrl: "paw-print", rarity: StoreItemRarity.EPIC },
  { name: "Monkey kit", category: StoreItemCategory.ANIMALS, levelRequired: 3, coinPrice: 170, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },
  { name: "Giraffe kit", category: StoreItemCategory.ANIMALS, levelRequired: 3, coinPrice: 130, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },
  { name: "Elephant kit", category: StoreItemCategory.ANIMALS, levelRequired: 10, coinPrice: 1400, imageUrl: "paw-print", rarity: StoreItemRarity.EPIC },
  { name: "Donkey kit", category: StoreItemCategory.ANIMALS, levelRequired: 1, coinPrice: 45, imageUrl: "paw-print", rarity: StoreItemRarity.COMMON },
  { name: "Ostrich kit", category: StoreItemCategory.ANIMALS, levelRequired: 3, coinPrice: 190, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },
  { name: "Otters kit", category: StoreItemCategory.ANIMALS, levelRequired: 1, coinPrice: 65, imageUrl: "paw-print", rarity: StoreItemRarity.COMMON },
  { name: "Rhino kit", category: StoreItemCategory.ANIMALS, levelRequired: 20, coinPrice: 3000, imageUrl: "paw-print", rarity: StoreItemRarity.LEGENDARY },
  { name: "Panda kit", category: StoreItemCategory.ANIMALS, levelRequired: 20, coinPrice: 3500, imageUrl: "paw-print", rarity: StoreItemRarity.LEGENDARY },
  { name: "Zebra kit", category: StoreItemCategory.ANIMALS, levelRequired: 3, coinPrice: 150, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },
  { name: "Flamingo kit", category: StoreItemCategory.ANIMALS, levelRequired: 5, coinPrice: 230, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },
  { name: "Axolotl kit", category: StoreItemCategory.ANIMALS, levelRequired: 5, coinPrice: 260, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },
  { name: "Dassie kit", category: StoreItemCategory.ANIMALS, levelRequired: 1, coinPrice: 75, imageUrl: "paw-print", rarity: StoreItemRarity.COMMON },
  { name: "Platypus kit", category: StoreItemCategory.ANIMALS, levelRequired: 5, coinPrice: 300, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },
  { name: "Tortoise kit", category: StoreItemCategory.ANIMALS, levelRequired: 1, coinPrice: 55, imageUrl: "paw-print", rarity: StoreItemRarity.COMMON },
  { name: "Capybara kit", category: StoreItemCategory.ANIMALS, levelRequired: 5, coinPrice: 340, imageUrl: "paw-print", rarity: StoreItemRarity.RARE },

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
