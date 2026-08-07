CREATE TABLE "EmployeeDirectoryEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "positionLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDirectoryEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeDirectoryEntry_employeeId_key" ON "EmployeeDirectoryEntry"("employeeId");
CREATE UNIQUE INDEX "EmployeeDirectoryEntry_email_key" ON "EmployeeDirectoryEntry"("email");
CREATE INDEX "EmployeeDirectoryEntry_positionLevel_idx" ON "EmployeeDirectoryEntry"("positionLevel");
