-- CreateEnum
CREATE TYPE "LuckyBoxKey" AS ENUM ('PARCEL', 'BUNDLE', 'HAUL', 'TROVE');

-- CreateTable
CREATE TABLE "OwnedLuckyBox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boxKey" "LuckyBoxKey" NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "results" JSONB,

    CONSTRAINT "OwnedLuckyBox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnedLuckyBox_userId_openedAt_idx" ON "OwnedLuckyBox"("userId", "openedAt");

-- AddForeignKey
ALTER TABLE "OwnedLuckyBox" ADD CONSTRAINT "OwnedLuckyBox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
