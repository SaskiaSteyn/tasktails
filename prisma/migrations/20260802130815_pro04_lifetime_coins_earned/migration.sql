-- AlterTable
ALTER TABLE "UserEconomy" ADD COLUMN     "lifetimeCoinsEarned" INTEGER NOT NULL DEFAULT 0;

-- Backfill: no account predating this column could have a nonzero value here
-- yet, so the current balance is the best approximation of what it has earned
-- lifetime — better than every existing participant reading as 0 earned.
UPDATE "UserEconomy" SET "lifetimeCoinsEarned" = "coins";
