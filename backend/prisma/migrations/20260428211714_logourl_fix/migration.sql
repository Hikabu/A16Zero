/*
  Warnings:

  - You are about to drop the column `logoutUrl` on the `job_posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "job_posts" DROP COLUMN "logoutUrl";
