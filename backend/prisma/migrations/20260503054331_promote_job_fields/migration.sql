-- AlterTable
ALTER TABLE "job_posts" ADD COLUMN     "requiredSeniority" "Seniority",
ADD COLUMN     "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];
