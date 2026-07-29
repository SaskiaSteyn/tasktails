"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  LevelUpScreen,
  type LevelUpReward,
} from "@/components/economy/level-up-screen";

/**
 * The plumbing behind ECO-07's celebration.
 *
 * Every screen that can move XP — task completion (TASK-11) and the Buy-XP card
 * (PRO-06) — gets its level-up event back in the same response that banked the
 * XP (`grantEarnings` / `buyXp` both return one). This turns that event into the
 * screen, so no caller has to own dialog state.
 *
 * Mounted once in `AppShell`, so `useLevelUp()` works from anywhere inside the
 * app frame and nothing is rendered until something actually levels up.
 */

/** The shape ECO-05 returns. Structural, not imported — economy.ts is server-only. */
export type LevelUpEventLike = {
  from: number;
  to: number;
  levelsGained: number[];
  xp: number;
  isMaxLevel: boolean;
};

type Celebration = {
  event: LevelUpEventLike;
  rewards?: LevelUpReward[];
};

type LevelUpContext = {
  /**
   * Show the celebration. Safe to call with `null` — the responses that carry
   * these events return null far more often than not, so callers can hand the
   * field straight over without a guard.
   */
  celebrate: (event: LevelUpEventLike | null | undefined, rewards?: LevelUpReward[]) => void;
};

const Context = createContext<LevelUpContext | null>(null);

/**
 * Raises the celebration. Returns a no-op outside the provider rather than
 * throwing: a missing provider should not take down a task completion that has
 * already been banked on the server.
 */
export function useLevelUp(): LevelUpContext {
  return (
    useContext(Context) ?? {
      celebrate: () => {},
    }
  );
}

export function LevelUpProvider({ children }: { children: React.ReactNode }) {
  // A queue, not a single slot: completing a task and converting coins in quick
  // succession can produce two events, and the second must not silently replace
  // the first mid-animation.
  const [queue, setQueue] = useState<Celebration[]>([]);

  const celebrate = useCallback(
    (event: LevelUpEventLike | null | undefined, rewards?: LevelUpReward[]) => {
      if (!event) return;
      setQueue((current) => [...current, { event, rewards }]);
    },
    [],
  );

  const dismiss = useCallback(() => setQueue((current) => current.slice(1)), []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);
  const current = queue[0];

  return (
    <Context.Provider value={value}>
      {children}
      {current ? (
        <LevelUpScreen
          // Keyed on the crossing so a queued second celebration remounts
          // rather than morphing the medallion from one number to the next.
          key={`${current.event.from}-${current.event.to}-${current.event.xp}`}
          open
          level={current.event.to}
          previousLevel={current.event.from}
          rewards={current.rewards}
          onDismiss={dismiss}
        />
      ) : null}
    </Context.Provider>
  );
}
