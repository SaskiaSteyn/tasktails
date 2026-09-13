-- DropIndex
DROP INDEX "OwnedLuckyBox_userId_openedAt_idx";

-- AlterTable
ALTER TABLE "OwnedLuckyBox" ADD COLUMN     "revealedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OwnedLuckyBox_userId_revealedAt_idx" ON "OwnedLuckyBox"("userId", "revealedAt");

-- Boxes opened before this column existed finished (or abandoned) their
-- reveal under the old rule; don't resurface them as "Continue".
UPDATE "OwnedLuckyBox" SET "revealedAt" = "openedAt" WHERE "openedAt" IS NOT NULL;
