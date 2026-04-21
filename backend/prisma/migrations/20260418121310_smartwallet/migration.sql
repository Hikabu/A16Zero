/*
  Warnings:

  - A unique constraint covering the columns `[smartAccountAddress]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "smartAccountAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "companies_smartAccountAddress_key" ON "companies"("smartAccountAddress");
