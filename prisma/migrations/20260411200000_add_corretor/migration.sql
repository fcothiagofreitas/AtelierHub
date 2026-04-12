-- CreateEnum
CREATE TYPE "CorretorPaymentMethod" AS ENUM ('PIX', 'CASH', 'BANK_TRANSFER');

-- CreateTable
CREATE TABLE "Corretor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" "CorretorPaymentMethod" NOT NULL DEFAULT 'PIX',
    "pixKey" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "bankAccount" TEXT,
    "notes" TEXT,
    "creditLimitConsignado" DECIMAL(14,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Corretor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Corretor_tenantId_idx" ON "Corretor"("tenantId");

-- AddForeignKey
ALTER TABLE "Corretor" ADD CONSTRAINT "Corretor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
