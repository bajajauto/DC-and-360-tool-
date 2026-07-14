-- AlterTable
ALTER TABLE "Cohort" ADD COLUMN     "nominationDeadline" TIMESTAMP(3),
ADD COLUMN     "photoDeadline" TIMESTAMP(3),
ADD COLUMN     "preWorkDeadline" TIMESTAMP(3),
ADD COLUMN     "roleInterviewDeadline" TIMESTAMP(3),
ADD COLUMN     "threeSixtyCutoff" TIMESTAMP(3);
