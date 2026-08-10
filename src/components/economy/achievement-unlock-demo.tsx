"use client";

import { useState } from "react";

import { AchievementUnlockScreen } from "@/components/economy/achievement-unlock-screen";
import { Button } from "@/components/ui/button";

/**
 * Style-guide harness for the achievement-unlock celebration
 * (`/style-guide#s10`), same reasoning `LevelUpDemo` documents: the screen
 * is a `<dialog>` that only opens in response to an unlock, so it can't be
 * drawn statically on the page. This opens the real one, one per badge in
 * the catalogue.
 */
const CATALOGUE = [
  { key: "streak_7_day", name: "Week Warrior", description: "Keep a 7-day task streak.", xpReward: 75 },
  { key: "tasks_10_trivial", name: "Small Steps", description: "Complete 10 Trivial tasks.", xpReward: 40 },
  { key: "zoo_pet_50", name: "Gentle Hands", description: "Pet animals 50 times.", xpReward: 60 },
  {
    key: "unlock_common_food",
    name: "Common Snack",
    description: "Own a Common food item.",
    xpReward: 15,
  },
];

export function AchievementUnlockDemo() {
  const [open, setOpen] = useState<string | null>(null);
  const achievement = CATALOGUE.find((entry) => entry.key === open);

  return (
    <div className="flex flex-wrap gap-2">
      {CATALOGUE.map((entry, index) => (
        <Button
          key={entry.key}
          size="inline"
          fullWidth={false}
          variant={index === 0 ? "primary" : "secondary"}
          onClick={() => setOpen(entry.key)}
        >
          {entry.name}
        </Button>
      ))}

      {achievement ? (
        <AchievementUnlockScreen
          key={achievement.key}
          open
          achievement={achievement}
          onDismiss={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
