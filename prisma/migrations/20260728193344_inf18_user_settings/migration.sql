-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyReminder" BOOLEAN NOT NULL DEFAULT true,
    "streakAlert" BOOLEAN NOT NULL DEFAULT true,
    "soundEffects" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing account gets a settings row, so the invariant
-- "an account always has settings" holds from this migration onward and PRO-15
-- can update rather than upsert. cuid() lives in the application, not Postgres,
-- so the ids are generated here with gen_random_uuid() — they are opaque keys
-- and nothing reads them.
INSERT INTO "UserSettings" ("id", "userId")
SELECT gen_random_uuid()::text, "id" FROM "User"
ON CONFLICT ("userId") DO NOTHING;
