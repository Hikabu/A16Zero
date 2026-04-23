/*
  Warnings:

  - You are about to drop the column `lastSyncedAt` on the `GithubProfile` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SyncStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "GithubProfile" DROP COLUMN "lastSyncedAt",
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "syncError" TEXT,
ALTER COLUMN "syncProgress" SET DEFAULT '0',
ALTER COLUMN "syncProgress" SET DATA TYPE TEXT;
