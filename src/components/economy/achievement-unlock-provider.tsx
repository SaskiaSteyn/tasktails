"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  AchievementUnlockScreen,
  type AchievementUnlockLike,
} from "@/components/economy/achievement-unlock-screen";

export type { AchievementUnlockLike };

/**
 * The plumbing behind the achievement-unlock celebration — same shape as
 * `LevelUpProvider`, deliberately: every route that can newly unlock a badge
 * (`evaluateAchievements()`'s five call sites — task/subtask completion,
 * checkout, and all three pet interactions) returns the newly-unlocked list
 * in its response, and this turns that into the screen so no caller owns
 * dialog state of its own.
 *
 * Mounted once in `AppShell`, so `useAchievementUnlock()` works from
 * anywhere inside the app frame and nothing renders until something
 * actually unlocks.
 */
type UnlockContext = {
  /**
   * Show the celebration, once per achievement. Safe to call with `null`/
   * `undefined`/`[]` — every response that carries this field returns an
   * empty array far more often than not, so callers can hand it straight
   * over without a guard.
   */
  celebrate: (achievements: AchievementUnlockLike[] | null | undefined) => void;
};

const Context = createContext<UnlockContext | null>(null);

/**
 * Returns a no-op outside the provider rather than throwing: a missing
 * provider should not take down a completion/purchase/interaction that has
 * already been banked on the server.
 */
export function useAchievementUnlock(): UnlockContext {
  return (
    useContext(Context) ?? {
      celebrate: () => {},
    }
  );
}

export function AchievementUnlockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // A queue, not a single slot — unlocking two badges in one action (e.g. a
  // task completion that crosses both a task-count and a level threshold at
  // once) must show both, not silently drop one mid-animation. Same reasoning
  // `LevelUpProvider`'s queue documents.
  const [queue, setQueue] = useState<AchievementUnlockLike[]>([]);

  const celebrate = useCallback((achievements: AchievementUnlockLike[] | null | undefined) => {
    if (!achievements || achievements.length === 0) return;
    setQueue((current) => [...current, ...achievements]);
  }, []);

  const dismiss = useCallback(() => setQueue((current) => current.slice(1)), []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);
  const current = queue[0];

  return (
    <Context.Provider value={value}>
      {children}
      {current ? (
        <AchievementUnlockScreen
          key={current.key}
          open
          achievement={current}
          onDismiss={dismiss}
        />
      ) : null}
    </Context.Provider>
  );
}
