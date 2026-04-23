-- CreateTable
CREATE TABLE "Vouch" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "voucherWallet" TEXT NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "txSignature" TEXT NOT NULL,
    "weight" TEXT NOT NULL DEFAULT 'standard',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "flag" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Vouch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_txSignature_key" ON "Vouch"("txSignature");

-- CreateIndex
CREATE INDEX "Vouch_candidateId_isActive_expiresAt_idx" ON "Vouch"("candidateId", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Vouch_voucherWallet_isActive_expiresAt_idx" ON "Vouch"("voucherWallet", "isActive", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_candidateId_voucherWallet_key" ON "Vouch"("candidateId", "voucherWallet");

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
