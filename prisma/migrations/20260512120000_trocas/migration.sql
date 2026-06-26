-- CreateEnum (idempotente: ignora se já existe)
DO $$ BEGIN
  CREATE TYPE "TrocaEstado" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterEnum (idempotente)
ALTER TYPE "MovimentoEstoqueTipo" ADD VALUE IF NOT EXISTS 'TROCA_ENTRADA';

-- AlterEnum (idempotente)
ALTER TYPE "PedidoModalidade" ADD VALUE IF NOT EXISTS 'TROCA';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "creditoTroca" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "trocaOrigemId" TEXT;

-- CreateTable
CREATE TABLE "Troca" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "estado" "TrocaEstado" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "creditoGerado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditoConsumido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditoRemanescente" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Troca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrocaItem" (
    "id" TEXT NOT NULL,
    "trocaId" TEXT NOT NULL,
    "produtoVariacaoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrocaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Troca_tenantId_idx" ON "Troca"("tenantId");

-- CreateIndex
CREATE INDEX "Troca_tenantId_storeId_idx" ON "Troca"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "Troca_tenantId_createdAt_idx" ON "Troca"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Troca_clienteId_idx" ON "Troca"("clienteId");

-- CreateIndex
CREATE INDEX "Troca_vendedorId_idx" ON "Troca"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Troca_storeId_numero_key" ON "Troca"("storeId", "numero");

-- CreateIndex
CREATE INDEX "TrocaItem_trocaId_idx" ON "TrocaItem"("trocaId");

-- CreateIndex
CREATE INDEX "TrocaItem_produtoVariacaoId_idx" ON "TrocaItem"("produtoVariacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_trocaOrigemId_key" ON "Pedido"("trocaOrigemId");

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Troca" ADD CONSTRAINT "Troca_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_trocaId_fkey" FOREIGN KEY ("trocaId") REFERENCES "Troca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_produtoVariacaoId_fkey" FOREIGN KEY ("produtoVariacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_trocaOrigemId_fkey" FOREIGN KEY ("trocaOrigemId") REFERENCES "Troca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
