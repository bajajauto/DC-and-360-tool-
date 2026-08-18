ALTER TABLE "Participant"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedFromCohortId" TEXT,
  ADD COLUMN "archivedFromCohortName" TEXT,
  ALTER COLUMN "cohortId" DROP NOT NULL;

ALTER TABLE "Participant" DROP CONSTRAINT "Participant_cohortId_fkey";
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Participant_cohortId_archivedAt_idx" ON "Participant"("cohortId", "archivedAt");
