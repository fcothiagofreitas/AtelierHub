-- CreateEnum
CREATE TYPE "ComissaoTipo" AS ENUM ('VENDEDOR', 'CORRETOR');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "percentualComissaoVendedorPadrao" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LancamentoComissao" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tipo" "ComissaoTipo" NOT NULL,
    "colaboradorId" TEXT,
    "corretorId" TEXT,
    "baseCalculo" DECIMAL(14,2) NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LancamentoComissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LancamentoComissao_pedidoId_tipo_key" ON "LancamentoComissao"("pedidoId", "tipo");

-- CreateIndex
CREATE INDEX "LancamentoComissao_tenantId_createdAt_idx" ON "LancamentoComissao"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LancamentoComissao_tenantId_storeId_idx" ON "LancamentoComissao"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "LancamentoComissao_colaboradorId_idx" ON "LancamentoComissao"("colaboradorId");

-- CreateIndex
CREATE INDEX "LancamentoComissao_corretorId_idx" ON "LancamentoComissao"("corretorId");

-- AddForeignKey
ALTER TABLE "LancamentoComissao" ADD CONSTRAINT "LancamentoComissao_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoComissao" ADD CONSTRAINT "LancamentoComissao_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoComissao" ADD CONSTRAINT "LancamentoComissao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoComissao" ADD CONSTRAINT "LancamentoComissao_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoComissao" ADD CONSTRAINT "LancamentoComissao_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Corretor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
