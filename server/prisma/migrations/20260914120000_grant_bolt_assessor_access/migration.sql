-- Provision the requested assessor account once, without resetting it on later boots.
DO $$
DECLARE
  matching_accounts integer;
BEGIN
  SELECT COUNT(*) INTO matching_accounts
  FROM "User"
  WHERE LOWER(TRIM("email")) = 'bolt@bajajauto.co.in';

  IF matching_accounts > 1 THEN
    RAISE EXCEPTION 'Multiple accounts match bolt@bajajauto.co.in; resolve duplicates before granting access';
  END IF;

  IF matching_accounts = 1 THEN
    UPDATE "User"
    SET "email" = 'bolt@bajajauto.co.in',
        "passwordHash" = 'scrypt:f8a61370ef8a60081b4c877bd1e92a71:fe0e2093814709c9d0e322aecf6e98a597bc95f72d9d0f742960b781a095e638a3c67a0255dbef2e4b9ee06e8eab2b7ae32716871f535432503becd5b463f5e5',
        "roles" = CASE
          WHEN 'ASSESSOR'::"Role" = ANY("roles") THEN "roles"
          ELSE array_append(COALESCE("roles", ARRAY[]::"Role"[]), 'ASSESSOR'::"Role")
        END,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE LOWER(TRIM("email")) = 'bolt@bajajauto.co.in';
  ELSE
    INSERT INTO "User" ("id", "name", "email", "designation", "passwordHash", "roles", "createdAt", "updatedAt")
    VALUES (
      'bolt-assessor-' || md5(random()::text || clock_timestamp()::text),
      'Bolt',
      'bolt@bajajauto.co.in',
      'Development Centre Assessor',
      'scrypt:f8a61370ef8a60081b4c877bd1e92a71:fe0e2093814709c9d0e322aecf6e98a597bc95f72d9d0f742960b781a095e638a3c67a0255dbef2e4b9ee06e8eab2b7ae32716871f535432503becd5b463f5e5',
      ARRAY['ASSESSOR'::"Role"],
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;
END $$;
