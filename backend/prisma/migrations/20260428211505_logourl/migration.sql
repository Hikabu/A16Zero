-- AlterEnum
ALTER TYPE "PipelineStage" ADD VALUE 'SHORTLISTED';

-- AlterEnum
ALTER TYPE "ShortlistStatus" ADD VALUE 'SHORTLISTED';

-- AlterTable
ALTER TABLE "job_posts" ADD COLUMN     "logoutUrl" TEXT;
