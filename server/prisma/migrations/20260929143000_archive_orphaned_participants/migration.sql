-- Data cleanup, no schema change. Cohorts deleted before the fix in commit
-- 9474752 left their participants behind with cohortId set to NULL by the
-- onDelete: SetNull foreign key, but archivedAt untouched -- i.e. active
-- participants with no cohort. That broke every screen assuming an active
-- participant has a cohort (assessor analysis list, report repository, buhr
-- dashboard, notification scheduler, etc).
--
-- Archive them using the same convention as the existing single-participant
-- archive route (cohortId already NULL, archivedAt set). Their original
-- cohort no longer exists, so archivedFromCohortId/Name are left NULL rather
-- than guessed. They'll appear in Archived Participants; hard-delete
-- individually from there if you want them gone for good.
UPDATE "Participant"
SET "archivedAt" = now()
WHERE "cohortId" IS NULL AND "archivedAt" IS NULL;
