-- ECO-02 — normalised match key for the anti-spam guardrail.
--
-- Added nullable, backfilled, then made NOT NULL, so the migration is safe on a
-- table that already has rows. The backfill expression must stay in step with
-- `titleKeyOf()` in src/lib/tasks.ts: trim, collapse inner whitespace,
-- lowercase. If one changes without the other, tasks created before this
-- migration stop matching tasks created after it.

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "titleKey" TEXT;

UPDATE "Task"
SET "titleKey" = lower(regexp_replace(btrim("title"), '\s+', ' ', 'g'));

ALTER TABLE "Task" ALTER COLUMN "titleKey" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Task_userId_titleKey_completedAt_idx" ON "Task"("userId", "titleKey", "completedAt");
