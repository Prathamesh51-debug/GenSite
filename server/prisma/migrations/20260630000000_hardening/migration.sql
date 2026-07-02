-- Transaction: store money as integer cents (not float), add Stripe session id
-- as an idempotency key so each checkout is fulfilled exactly once.
ALTER TABLE "Transaction" RENAME COLUMN "amount" TO "amountCents";
ALTER TABLE "Transaction" ALTER COLUMN "amountCents" TYPE INTEGER USING (ROUND("amountCents" * 100));
ALTER TABLE "Transaction" ADD COLUMN "stripeSessionId" TEXT;
CREATE UNIQUE INDEX "Transaction_stripeSessionId_key" ON "Transaction"("stripeSessionId");

-- A user's email must be unique.
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- Indexes on the foreign keys used in hot-path filters (project loads, history).
CREATE INDEX "WebsiteProject_userId_idx" ON "WebsiteProject"("userId");
CREATE INDEX "Version_projectId_idx" ON "Version"("projectId");
CREATE INDEX "Conversation_projectId_idx" ON "Conversation"("projectId");
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
