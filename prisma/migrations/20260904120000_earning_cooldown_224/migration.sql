-- #224 — replace the retired NFR-TASK-2 daily cap (dailyCoinsEarned /
-- dailyXpEarned / dailyCapResetAt) with the earning-cooldown window.
-- The dropped columns only ever held a transient same-day running total;
-- lifetimeCoinsEarned (the accumulating figure) is untouched.
ALTER TABLE "UserEconomy" DROP COLUMN "dailyCapResetAt",
DROP COLUMN "dailyCoinsEarned",
DROP COLUMN "dailyXpEarned",
ADD COLUMN     "earningCooldownUntil" TIMESTAMP(3),
ADD COLUMN     "earningWindowTiers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
