-- Remove the temporary feedback task and nominee created for the misspelled email.
DELETE FROM "FeedbackTask"
WHERE "nomineeId" IN (
    SELECT nominee."id"
    FROM "Nominee" nominee
    JOIN "Participant" participant ON participant."id" = nominee."participantId"
    JOIN "User" participant_user ON participant_user."id" = participant."userId"
    WHERE LOWER(participant_user."email") = 'achaturvedi2@bajajext.co.in'
      AND LOWER(nominee."email") = 'srhoit@bajajext.co.in'
      AND nominee."source" = 'temporary-test'
);

DELETE FROM "Nominee"
WHERE "id" IN (
    SELECT nominee."id"
    FROM "Nominee" nominee
    JOIN "Participant" participant ON participant."id" = nominee."participantId"
    JOIN "User" participant_user ON participant_user."id" = participant."userId"
    WHERE LOWER(participant_user."email") = 'achaturvedi2@bajajext.co.in'
      AND LOWER(nominee."email") = 'srhoit@bajajext.co.in'
      AND nominee."source" = 'temporary-test'
);

-- Undo the Respondent-only role on the misspelled account. If it represents a
-- participant, restore Participant; otherwise leave it with no temporary role.
UPDATE "User" wrong_user
SET "roles" = CASE
    WHEN EXISTS (SELECT 1 FROM "Participant" participant WHERE participant."userId" = wrong_user."id")
      THEN ARRAY['PARTICIPANT']::"Role"[]
    ELSE ARRAY[]::"Role"[]
END
WHERE LOWER(wrong_user."email") = 'srhoit@bajajext.co.in';

-- Apply the temporary Respondent-only role to the correctly spelled account.
UPDATE "User"
SET "roles" = ARRAY['RESPONDENT']::"Role"[]
WHERE LOWER("email") = 'srohit@bajajext.co.in';

INSERT INTO "Nominee" (
    "id",
    "participantId",
    "userId",
    "name",
    "email",
    "employeeId",
    "isExternal",
    "relationship",
    "source",
    "locked",
    "status",
    "submittedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'test-srohit-anushka-peer-nominee',
    participant."id",
    respondent."id",
    respondent."name",
    respondent."email",
    respondent."employeeId",
    false,
    'PEER'::"NomineeRelationship",
    'temporary-test',
    true,
    'SUBMITTED'::"SubmissionStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Participant" participant
JOIN "User" participant_user ON participant_user."id" = participant."userId"
JOIN "User" respondent ON LOWER(respondent."email") = 'srohit@bajajext.co.in'
WHERE LOWER(participant_user."email") = 'achaturvedi2@bajajext.co.in'
ON CONFLICT ("participantId", "email", "relationship") DO UPDATE
SET
    "userId" = EXCLUDED."userId",
    "employeeId" = EXCLUDED."employeeId",
    "locked" = true,
    "status" = 'SUBMITTED'::"SubmissionStatus",
    "submittedAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "FeedbackTask" (
    "id",
    "participantId",
    "respondentId",
    "nomineeId",
    "relationship",
    "status",
    "dueAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'test-srohit-anushka-peer-task',
    nominee."participantId",
    nominee."userId",
    nominee."id",
    'PEER',
    'PENDING'::"FeedbackStatus",
    cohort."threeSixtyCutoff",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Nominee" nominee
JOIN "Participant" participant ON participant."id" = nominee."participantId"
JOIN "Cohort" cohort ON cohort."id" = participant."cohortId"
JOIN "User" participant_user ON participant_user."id" = participant."userId"
WHERE LOWER(participant_user."email") = 'achaturvedi2@bajajext.co.in'
  AND LOWER(nominee."email") = 'srohit@bajajext.co.in'
  AND nominee."relationship" = 'PEER'::"NomineeRelationship"
  AND NOT EXISTS (
      SELECT 1 FROM "FeedbackTask" task WHERE task."nomineeId" = nominee."id"
  );
