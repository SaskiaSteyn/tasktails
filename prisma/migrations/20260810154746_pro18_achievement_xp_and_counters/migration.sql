-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "xpReward" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "timesPetted" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserEconomy" ADD COLUMN     "lifetimeFeedInteractions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lifetimePetInteractions" INTEGER NOT NULL DEFAULT 0;
