-- Repair Prateek Khanduri's response for Vikrant Sharma when a historical
-- autosave/submit race left a complete stored response marked as SAVED.
-- Do not manufacture a submission: all 30 required peer ratings must exist
-- and each must be a numeric value from 1 through 4.
WITH complete_response AS (
  SELECT
    task."id" AS "taskId",
    response."updatedAt" AS "responseUpdatedAt"
  FROM "FeedbackTask" AS task
  JOIN "Nominee" AS nominee
    ON nominee."id" = task."nomineeId"
  JOIN "Participant" AS participant
    ON participant."id" = task."participantId"
  JOIN "User" AS participant_user
    ON participant_user."id" = participant."userId"
  JOIN "FeedbackResponse" AS response
    ON response."feedbackTaskId" = task."id"
   AND response."responseKey" = 'overall'
  WHERE LOWER(TRIM(nominee."email")) = 'pkhanduri@bajajauto.co.in'
    AND LOWER(participant_user."name") LIKE '%vikrant%sharma%'
    AND task."relationship" = 'PEER'
    AND task."status" = 'SAVED'
    AND jsonb_typeof(response."ratings") = 'object'
    AND (
      SELECT COUNT(*)
      FROM jsonb_each(
        CASE
          WHEN jsonb_typeof(response."ratings") = 'object' THEN response."ratings"
          ELSE '{}'::jsonb
        END
      ) AS rating
      WHERE jsonb_typeof(rating.value) = 'number'
        AND (rating.value #>> '{}')::numeric BETWEEN 1 AND 4
    ) >= 30
)
UPDATE "FeedbackTask" AS task
SET
  "status" = 'SUBMITTED',
  "submittedAt" = COALESCE(task."submittedAt", complete_response."responseUpdatedAt", NOW()),
  "updatedAt" = NOW()
FROM complete_response
WHERE task."id" = complete_response."taskId";
