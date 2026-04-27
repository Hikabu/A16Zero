-- CreateTable
CREATE TABLE "VouchChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nonce" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VouchChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VouchChallenge_nonce_key" ON "VouchChallenge"("nonce");

-- CreateIndex
CREATE INDEX "VouchChallenge_userId_idx" ON "VouchChallenge"("userId");

-- CreateIndex
CREATE INDEX "VouchChallenge_expiresAt_idx" ON "VouchChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "VouchChallenge" ADD CONSTRAINT "VouchChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
