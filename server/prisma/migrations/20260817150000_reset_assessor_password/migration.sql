DO $$
DECLARE
  matching_accounts integer;
  updated_accounts integer;
BEGIN
  SELECT COUNT(*)
  INTO matching_accounts
  FROM "User"
  WHERE LOWER("email") = 'assessor@bajajauto.co.in'
    AND "roles" @> ARRAY['ASSESSOR'::"Role"];

  IF matching_accounts <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one assessor@bajajauto.co.in account with the ASSESSOR role, found %',
      matching_accounts;
  END IF;

  UPDATE "User"
  SET "passwordHash" = 'scrypt:64d535c148b1803a71c9f4810710b4ef:caee1129344e0f31972df70e49e68f0f00f549f2eee3383176fa140bdd68a9cfa56e02045eb030e3f4196be2831ed24c8d0e78c9315ae39a69ecd7e9f03fe61f'
  WHERE LOWER("email") = 'assessor@bajajauto.co.in'
    AND "roles" @> ARRAY['ASSESSOR'::"Role"];

  GET DIAGNOSTICS updated_accounts = ROW_COUNT;

  IF updated_accounts <> 1 THEN
    RAISE EXCEPTION
      'Expected to update exactly one assessor account, updated %',
      updated_accounts;
  END IF;
END $$;
