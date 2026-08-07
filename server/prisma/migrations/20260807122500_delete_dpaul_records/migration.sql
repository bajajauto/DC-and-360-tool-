-- Permanently remove dpaul1@bajajauto.co.in and all directly associated data.
-- Cohorts and unrelated participant/respondent records are preserved.

DELETE FROM "EmailOutbox"
WHERE LOWER("toEmail") = 'dpaul1@bajajauto.co.in'
   OR "actorId" IN (
     SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in'
   )
   OR "magicLinkId" IN (
     SELECT "id" FROM "MagicLink"
     WHERE LOWER("email") = 'dpaul1@bajajauto.co.in'
        OR "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
        OR CAST("payload" AS TEXT) ILIKE '%dpaul1@bajajauto.co.in%'
   )
   OR ("entity" = 'Participant' AND "entityId" IN (
     SELECT "id" FROM "Participant"
     WHERE "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   ))
   OR ("entity" = 'ParticipantTask' AND EXISTS (
     SELECT 1 FROM "Participant" p
     WHERE p."userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
       AND "EmailOutbox"."entityId" LIKE p."id" || ':%'
   ))
   OR ("entity" = 'FeedbackTask' AND "entityId" IN (
     SELECT ft."id"
     FROM "FeedbackTask" ft
     LEFT JOIN "Nominee" n ON n."id" = ft."nomineeId"
     WHERE ft."participantId" IN (
       SELECT "id" FROM "Participant"
       WHERE "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
     )
        OR ft."respondentId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
        OR LOWER(n."email") = 'dpaul1@bajajauto.co.in'
        OR n."userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   ))
   OR ("entity" = 'Report' AND "entityId" IN (
     SELECT r."id" FROM "Report" r
     WHERE r."participantId" IN (
       SELECT "id" FROM "Participant"
       WHERE "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
     )
   ))
   OR CAST("metadata" AS TEXT) ILIKE '%dpaul1@bajajauto.co.in%';

DELETE FROM "MagicLink"
WHERE LOWER("email") = 'dpaul1@bajajauto.co.in'
   OR "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   OR CAST("payload" AS TEXT) ILIKE '%dpaul1@bajajauto.co.in%'
   OR "payload"->>'participantId' IN (
     SELECT "id" FROM "Participant"
     WHERE "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   )
   OR "payload"->>'taskId' IN (
     SELECT ft."id"
     FROM "FeedbackTask" ft
     LEFT JOIN "Nominee" n ON n."id" = ft."nomineeId"
     WHERE ft."respondentId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
        OR LOWER(n."email") = 'dpaul1@bajajauto.co.in'
        OR n."userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   );

DELETE FROM "FeedbackTask"
WHERE "participantId" IN (
    SELECT "id" FROM "Participant"
    WHERE "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
  )
   OR "respondentId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   OR "nomineeId" IN (
     SELECT "id" FROM "Nominee"
     WHERE LOWER("email") = 'dpaul1@bajajauto.co.in'
        OR "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   );

DELETE FROM "Nominee"
WHERE LOWER("email") = 'dpaul1@bajajauto.co.in'
   OR "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   OR "participantId" IN (
     SELECT "id" FROM "Participant"
     WHERE "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in')
   );

DELETE FROM "Participant"
WHERE "userId" IN (SELECT "id" FROM "User" WHERE LOWER("email") = 'dpaul1@bajajauto.co.in');

DELETE FROM "EmployeeDirectoryEntry"
WHERE LOWER(COALESCE("email", '')) = 'dpaul1@bajajauto.co.in';

DELETE FROM "User"
WHERE LOWER("email") = 'dpaul1@bajajauto.co.in';
