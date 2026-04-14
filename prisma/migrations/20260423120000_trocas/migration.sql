-- AlterEnum
ALTER TYPE "MovimentoEstoqueTipo" ADD VALUE 'TROCA_DEVOLUCAO';

-- CreateEnum
CREATE TYPE "TrocaEstado" AS ENUM ('CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TrocaTipoFluxo" AS ENUM ('VENDA_QUITADA', 'CONSIGNADO_NAO_QUITADO');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "prazoTrocaDias" INTEGER;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "creditoTroca" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Troca" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "pedidoOrigemId" TEXT NOT NULL,
    "tipoFluxo" "TrocaTipoFluxo" NOT NULL,
    "estado" "TrocaEstado" NOT NULL DEFAULT 'CONCLUIDA',
    "valorCredito" DECIMAL(14,2) NOT NULL,
    "obs" TEXT,
    "pedidoNovoId" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Troca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrocaItem" (
    "id" TEXT NOT NULL,
    "trocaId" TEXT NOT NULL,
    "pedidoItemId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "TrocaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Troca_pedidoNovoId_key" ON "Troca"("pedidoNovoId");

-- CreateIndex
CREATE UNIQUE INDEX "Troca_storeId_numero_key" ON "Troca"("storeId", "numero");

-- CreateIndex
CREATE INDEX "Troca_tenantId_createdAt_idx" ON "Troca"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Troca_pedidoOrigemId_idx" ON "Troca"("pedidoOrigemId");

-- CreateIndex
CREATE INDEX "Troca_clienteId_idx" ON "Troca"("clienteId");

-- CreateIndex
CREATE INDEX "TrocaItem_trocaId_idx" ON "TrocaItem"("trocaId");

-- CreateIndex
CREATE INDEX "TrocaItem_pedidoItemId_idx" ON "TrocaItem"("pedidoItemId");

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_pedidoOrigemId_fkey" FOREIGN KEY ("pedidoOrigemId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_pedidoNovoId_fkey" FOREIGN KEY ("pedidoNovoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_trocaId_fkey" FOREIGN KEY ("trocaId") REFERENCES "Troca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_pedidoItemId_fkey" FOREIGN KEY ("pedidoItemId") REFERENCES "PedidoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
