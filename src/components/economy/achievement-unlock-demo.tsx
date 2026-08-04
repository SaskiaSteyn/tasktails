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
  { key: "task_champion", name: "Task Champion", description: "Complete 10 tasks." },
  { key: "rising_star", name: "Rising Star", description: "Reach Level 5." },
  { key: "week_warrior", name: "Week Warrior", description: "Keep a 7-day streak." },
  {
    key: "first_purchase",
    name: "First Purchase",
    description: "Buy your first item from the store.",
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
