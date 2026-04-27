/*
  Warnings:

  - You are about to drop the column `signature` on the `Vouch` table. All the data in the column will be lost.
  - You are about to drop the `VouchChallenge` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[txSignature]` on the table `Vouch` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `txSignature` to the `Vouch` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('APPLIED', 'REVIEWED', 'INTERVIEW_HR', 'INTERVIEW_TECHNICAL', 'INTERVIEW_FINAL', 'OFFER', 'HIRED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "VouchChallenge" DROP CONSTRAINT "VouchChallenge_userId_fkey";

-- DropIndex
DROP INDEX "Vouch_signature_key";

-- AlterTable
ALTER TABLE "Vouch" DROP COLUMN "signature",
ADD COLUMN     "txSignature" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "job_posts" ADD COLUMN     "dynamicWeights" JSONB,
ADD COLUMN     "isWeb3Role" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parsedRequirements" JSONB;

-- AlterTable
ALTER TABLE "shortlists" ADD COLUMN     "decisionCard" JSONB,
ADD COLUMN     "gapReport" JSONB,
ADD COLUMN     "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'APPLIED',
ADD COLUMN     "pipelineStageHistory" JSONB;

-- DropTable
DROP TABLE "VouchChallenge";

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_txSignature_key" ON "Vouch"("txSignature");
