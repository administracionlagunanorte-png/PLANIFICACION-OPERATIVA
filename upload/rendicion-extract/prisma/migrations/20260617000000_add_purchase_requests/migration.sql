-- CreateTable: PurchaseRequest (NON-DESTRUCTIVE - only adds a new table)
CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL,
    "correlativeNumber" INTEGER NOT NULL,
    "productDescription" TEXT NOT NULL,
    "brand" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "productLink" TEXT,
    "referencePhotoUrl" TEXT,
    "directProvider" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "userId" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PurchaseQuote
CREATE TABLE "purchase_quotes" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "fileName" TEXT,
    "fileData" TEXT,
    "fileType" TEXT,
    "notes" TEXT,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_correlativeNumber_key" ON "purchase_requests"("correlativeNumber");

-- AddForeignKey: purchase_requests -> users (DO NOT cascade; preserve history)
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: purchase_quotes -> purchase_requests (cascade when request is deleted)
ALTER TABLE "purchase_quotes" ADD CONSTRAINT "purchase_quotes_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: This migration is purely additive. No existing tables are modified or dropped.
-- Existing rendiciones, users, and categories are completely preserved.
