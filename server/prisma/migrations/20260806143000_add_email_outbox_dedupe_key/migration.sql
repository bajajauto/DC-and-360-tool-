ALTER TABLE "EmailOutbox" ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "EmailOutbox_dedupeKey_key" ON "EmailOutbox"("dedupeKey");
