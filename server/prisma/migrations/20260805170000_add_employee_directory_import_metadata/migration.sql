CREATE TABLE "EmployeeDirectoryImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "withEmail" INTEGER NOT NULL,
    "withoutEmail" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,

    CONSTRAINT "EmployeeDirectoryImport_pkey" PRIMARY KEY ("id")
);
