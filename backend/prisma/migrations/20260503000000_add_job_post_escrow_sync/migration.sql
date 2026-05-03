-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('UNFUNDED', 'FUNDED', 'RELEASED', 'REFUNDED');

-- AlterTable
ALTER TABLE "job_posts"
ADD COLUMN "escrowId" BIGINT,
ADD COLUMN "escrowAddress" TEXT,
ADD COLUMN "candidateWallet" TEXT,
ADD COLUMN "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'UNFUNDED';

-- CreateIndex
CREATE UNIQUE INDEX "job_posts_escrowId_key" ON "job_posts"("escrowId");

-- CreateIndex
CREATE UNIQUE INDEX "job_posts_escrowAddress_key" ON "job_posts"("escrowAddress");
