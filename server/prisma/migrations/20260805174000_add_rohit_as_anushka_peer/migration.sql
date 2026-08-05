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
    'test-rohit-anushka-peer-nominee',
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
JOIN "User" respondent ON LOWER(respondent."email") = 'srhoit@bajajext.co.in'
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
    'test-rohit-anushka-peer-task',
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
  AND LOWER(nominee."email") = 'srhoit@bajajext.co.in'
  AND nominee."relationship" = 'PEER'::"NomineeRelationship"
  AND NOT EXISTS (
      SELECT 1 FROM "FeedbackTask" task WHERE task."nomineeId" = nominee."id"
  );
