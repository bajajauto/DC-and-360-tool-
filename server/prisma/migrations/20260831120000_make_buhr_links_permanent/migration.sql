-- BUHR login links are reusable account-entry links, like participant links.
-- Restore already-expired links as well as keeping all existing links active.
UPDATE "MagicLink"
SET "expiresAt" = TIMESTAMP '9999-12-31 23:59:59.999'
WHERE "role" = 'BUHR';
