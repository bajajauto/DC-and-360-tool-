ALTER TABLE "Participant" ADD COLUMN "nickname" TEXT;

CREATE UNIQUE INDEX "Participant_nickname_key" ON "Participant"("nickname");
