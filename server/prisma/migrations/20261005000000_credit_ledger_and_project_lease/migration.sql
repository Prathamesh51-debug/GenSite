-- Durable credit holds: a charge is recorded as pending and settled or refunded
-- exactly once, so a crash mid-generation can be reconciled by the sweeper.
CREATE TYPE "ChargeStatus" AS ENUM ('pending', 'settled', 'refunded');

CREATE TABLE "CreditCharge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreditCharge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditCharge_userId_idx" ON "CreditCharge"("userId");
CREATE INDEX "CreditCharge_status_createdAt_idx" ON "CreditCharge"("status", "createdAt");
CREATE INDEX "CreditCharge_kind_createdAt_idx" ON "CreditCharge"("kind", "createdAt");

ALTER TABLE "CreditCharge" ADD CONSTRAINT "CreditCharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-project lease replacing the process-local edit/generation locks.
ALTER TABLE "WebsiteProject" ADD COLUMN "lockToken" TEXT;
ALTER TABLE "WebsiteProject" ADD COLUMN "lockedUntil" TIMESTAMP(3);
