-- Participant login links are permanent and reusable while the linked
-- participant account remains active. Respondent and BUHR links retain their
-- existing expiry dates.
UPDATE "MagicLink"
SET "expiresAt" = TIMESTAMP '9999-12-31 23:59:59.999'
WHERE "role" = 'PARTICIPANT';
