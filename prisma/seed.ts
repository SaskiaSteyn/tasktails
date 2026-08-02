import { StoreItemCategory } from "@/generated/prisma/client";
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
 * Idempotent: looks up by `name` before writing, so re-running the seed
 * updates the existing row instead of duplicating it. `name` isn't a unique
 * constraint in the schema (INF-04) — enforcing that is out of scope here —
 * so this checks in application code rather than using `upsert`.
 */
const catalogue: Array<{
  name: string;
  category: StoreItemCategory;
  levelRequired: number;
  coinPrice: number;
  imageUrl: string;
}> = [
  {
    name: "Sunflower seeds",
    category: StoreItemCategory.FOOD,
    levelRequired: 1,
    coinPrice: 40,
    imageUrl: "wheat",
  },
  {
    name: "Red collar",
    category: StoreItemCategory.ACCESSORIES,
    levelRequired: 1,
    coinPrice: 65,
    imageUrl: "shirt",
  },
  {
    name: "Treat box",
    category: StoreItemCategory.FOOD,
    levelRequired: 3,
    coinPrice: 120,
    imageUrl: "package",
  },
  {
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
  },
  {
    name: "Fox kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 7,
    coinPrice: 550,
    imageUrl: "/animals/fox.svg",
  },
  {
    name: "Penguin kit",
    category: StoreItemCategory.ANIMALS,
    levelRequired: 10,
    coinPrice: 1200,
    imageUrl: "/animals/penguin.svg",
  },
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
    const existing = await prisma.storeItem.findFirst({
      where: { name: item.name },
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
