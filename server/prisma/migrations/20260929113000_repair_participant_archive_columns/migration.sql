-- Repair production schema drift where these earlier migrations were recorded
-- as applied but their Participant columns and indexes are absent.
ALTER TABLE "Participant"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedFromCohortId" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedFromCohortName" TEXT,
  ADD COLUMN IF NOT EXISTS "nickname" TEXT,
  ALTER COLUMN "cohortId" DROP NOT NULL;

ALTER TABLE "Participant" DROP CONSTRAINT IF EXISTS "Participant_cohortId_fkey";
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Participant_cohortId_archivedAt_idx"
  ON "Participant"("cohortId", "archivedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Participant_cohortId_nickname_key"
  ON "Participant"("cohortId", "nickname");
