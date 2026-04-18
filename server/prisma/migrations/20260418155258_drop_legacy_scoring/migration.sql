/*
  Warnings:

  - You are about to drop the column `behaviorPattern` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `capabilityStatements` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `confidenceEnvelope` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `decisionCard` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `gapReport` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `temporalProfile` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the `BenchmarkCohort` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CandidateClaim` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CandidateSignals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CareerTimeline` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeveloperSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FairnessReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HireOutcome` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HrSavedView` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformPrior` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoiSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CandidateClaim" DROP CONSTRAINT "CandidateClaim_devCandidateId_fkey";

-- DropForeignKey
ALTER TABLE "CandidateSignals" DROP CONSTRAINT "CandidateSignals_devCandidateId_fkey";

-- DropForeignKey
ALTER TABLE "CareerTimeline" DROP CONSTRAINT "CareerTimeline_devCandidateId_fkey";

-- DropForeignKey
ALTER TABLE "DeveloperSnapshot" DROP CONSTRAINT "DeveloperSnapshot_devCandidateId_fkey";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "behaviorPattern",
DROP COLUMN "capabilityStatements",
DROP COLUMN "confidenceEnvelope",
DROP COLUMN "decisionCard",
DROP COLUMN "gapReport",
DROP COLUMN "temporalProfile",
ALTER COLUMN "roleFitScore" SET DEFAULT 0,
ALTER COLUMN "fitTier" SET DEFAULT 'PASS',
ALTER COLUMN "fraudTier" SET DEFAULT 'CLEAN';

-- DropTable
DROP TABLE "BenchmarkCohort";

-- DropTable
DROP TABLE "CandidateClaim";

-- DropTable
DROP TABLE "CandidateSignals";

-- DropTable
DROP TABLE "CareerTimeline";

-- DropTable
DROP TABLE "DeveloperSnapshot";

-- DropTable
DROP TABLE "FairnessReport";

-- DropTable
DROP TABLE "HireOutcome";

-- DropTable
DROP TABLE "HrSavedView";

-- DropTable
DROP TABLE "PlatformPrior";

-- DropTable
DROP TABLE "RoiSnapshot";

-- DropEnum
DROP TYPE "ClaimType";
