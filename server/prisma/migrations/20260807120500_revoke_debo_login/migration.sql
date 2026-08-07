-- Revoke login access for this account while preserving all associated records.
UPDATE "User"
SET
  "passwordHash" = NULL,
  "roles" = ARRAY[]::"Role"[],
  "updatedAt" = CURRENT_TIMESTAMP
WHERE LOWER("email") = 'dpaul1@bajajauto.co.in';
