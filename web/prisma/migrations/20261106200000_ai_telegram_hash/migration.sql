-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "aiCheckedAt" TIMESTAMP(3),
ADD COLUMN     "aiData" JSONB,
ADD COLUMN     "aiReasons" JSONB,
ADD COLUMN     "aiVerdict" TEXT,
ADD COLUMN     "receiptTxnId" TEXT;

-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "sha256" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkToken" TEXT;

-- CreateIndex
CREATE INDEX "Order_receiptTxnId_idx" ON "Order"("receiptTxnId");

-- CreateIndex
CREATE INDEX "StoredFile_sha256_idx" ON "StoredFile"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramLinkToken_key" ON "User"("telegramLinkToken");

