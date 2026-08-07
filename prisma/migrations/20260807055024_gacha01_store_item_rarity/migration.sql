-- CreateEnum
CREATE TYPE "StoreItemRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- AlterTable
ALTER TABLE "StoreItem" ADD COLUMN     "rarity" "StoreItemRarity";
