UPDATE "User"
SET "roles" = ARRAY['RESPONDENT']::"Role"[]
WHERE LOWER("email") = 'srhoit@bajajext.co.in';
