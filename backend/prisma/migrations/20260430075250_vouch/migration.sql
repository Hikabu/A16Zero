/*
  Warnings:

  - You are about to drop the column `signature` on the `Vouch` table. All the data in the column will be lost.
  - You are about to drop the `VouchChallenge` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[txSignature]` on the table `Vouch` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `txSignature` to the `Vouch` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "VouchChallenge" DROP CONSTRAINT "VouchChallenge_userId_fkey";

-- DropIndex
DROP INDEX "Vouch_signature_key";

-- AlterTable
ALTER TABLE "Vouch" DROP COLUMN "signature",
ADD COLUMN     "txSignature" TEXT NOT NULL;

-- DropTable
DROP TABLE "VouchChallenge";

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_txSignature_key" ON "Vouch"("txSignature");
