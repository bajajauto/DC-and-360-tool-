BEGIN;

CREATE UNIQUE INDEX "Participant_cohortId_nickname_key" ON "Participant"("cohortId", "nickname");
DROP INDEX "Participant_nickname_key";

COMMIT;
