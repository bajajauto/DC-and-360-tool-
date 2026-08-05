DROP INDEX "EmployeeDirectoryEntry_email_key";
ALTER TABLE "EmployeeDirectoryEntry" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "EmployeeDirectoryEntry" ALTER COLUMN "name" SET NOT NULL;
CREATE INDEX "EmployeeDirectoryEntry_email_idx" ON "EmployeeDirectoryEntry"("email");
