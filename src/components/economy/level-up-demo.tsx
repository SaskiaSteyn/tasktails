"use client";

import { Coins, Sparkles } from "lucide-react";
import { useState } from "react";

import { LevelUpScreen } from "@/components/economy/level-up-screen";
import { Button } from "@/components/ui/button";

/**
 * Style-guide harness for ECO-07 (`/style-guide#s08`).
 *
 * The celebration is a `<dialog>` that only opens in response to a level-up, so
 * it cannot be drawn statically on the page beside the other components. This
 * opens the real one, in its three shapes: the ordinary single crossing, a
 * multi-level climb, and the two-action variant the addendum specifies when
 * there are reward tiles to claim.
 *
 * The reward tiles use the addendum's own example copy. Nothing in the shipped
 * economy populates them — Requirements §3 defines no level-up payout — so this
 * is the only place that variant is exercised.
 */

type Demo = "single" | "climb" | "rewards";

export function LevelUpDemo() {
  const [open, setOpen] = useState<Demo | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="inline" fullWidth={false} onClick={() => setOpen("single")}>
        One level
      </Button>
      <Button
        size="inline"
        variant="secondary"
        fullWidth={false}
        onClick={() => setOpen("climb")}
      >
        Multi-level climb
      </Button>
      <Button
        size="inline"
        variant="secondary"
        fullWidth={false}
        onClick={() => setOpen("rewards")}
      >
        With reward tiles
      </Button>

      <LevelUpScreen
        key={open ?? "idle"}
        open={open !== null}
        level={open === "climb" ? 5 : 4}
        previousLevel={open === "climb" ? 1 : 3}
        rewards={
          open === "rewards"
            ? [
                { icon: Coins, value: "+150", label: "BONUS COINS" },
                { icon: Sparkles, value: "Star hat", label: "NEW ACCESSORY" },
              ]
            : []
        }
        onDismiss={() => setOpen(null)}
      />
    </div>
  );
}
