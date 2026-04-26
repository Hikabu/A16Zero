/*
  Warnings:

  - You are about to drop the column `walletAddress` on the `Web3Profile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `GithubProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Web3Profile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Web3Profile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GithubProfile" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Web3Profile" DROP COLUMN "walletAddress",
ADD COLUMN     "solanaAddress" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "analysis_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubProfile_userId_key" ON "GithubProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Web3Profile_userId_key" ON "Web3Profile"("userId");

-- AddForeignKey
ALTER TABLE "GithubProfile" ADD CONSTRAINT "GithubProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Web3Profile" ADD CONSTRAINT "Web3Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
