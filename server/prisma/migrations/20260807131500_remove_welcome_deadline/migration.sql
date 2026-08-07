UPDATE "NotificationTemplate"
SET
  "body" = REPLACE(
    "body",
    E'\nDeadline: {{Prework Deadline}} EOD\n',
    E'\n'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "templateId" = 'welcome';
