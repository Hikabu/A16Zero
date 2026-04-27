/*
  Warnings:

  - You are about to drop the column `txSignature` on the `Vouch` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[signature]` on the table `Vouch` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `signature` to the `Vouch` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Vouch_txSignature_key";

-- AlterTable
ALTER TABLE "Vouch" DROP COLUMN "txSignature",
ADD COLUMN     "signature" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_signature_key" ON "Vouch"("signature");
