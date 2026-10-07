-- The earning window never expired: three completions days apart still
-- started a cooldown. Each slot now carries its completion time, and slots
-- older than EARNING_WINDOW_MINUTES drop out. Existing rows have tiers but no
-- times, so their stale slots are dropped on the next completion.
ALTER TABLE "UserEconomy" ADD COLUMN     "earningWindowTimes" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[];
