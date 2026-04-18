/*
  Warnings:

  - A unique constraint covering the columns `[walletAddress]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[privyId]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "privyId" TEXT,
ADD COLUMN     "walletAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "companies_walletAddress_key" ON "companies"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "companies_privyId_key" ON "companies"("privyId");
