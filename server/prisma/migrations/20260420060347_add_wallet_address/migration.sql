/*
  Warnings:

  - You are about to drop the column `evmAddress` on the `Web3Profile` table. All the data in the column will be lost.
  - You are about to drop the column `solanaAddress` on the `Web3Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Web3Profile" DROP COLUMN "evmAddress",
DROP COLUMN "solanaAddress",
ADD COLUMN     "walletAddress" TEXT;
