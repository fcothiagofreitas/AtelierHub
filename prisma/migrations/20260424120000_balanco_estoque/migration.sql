-- CreateEnum
CREATE TYPE "BalancoEstoqueEstado" AS ENUM ('RASCUNHO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "BalancoEstoque" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "BalancoEstoqueEstado" NOT NULL DEFAULT 'RASCUNHO',
    "observacoes" TEXT,
    "criadoPorId" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BalancoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalancoEstoqueItem" (
    "id" TEXT NOT NULL,
    "balancoId" TEXT NOT NULL,
    "produtoVariacaoId" TEXT NOT NULL,
    "saldoSnapshot" INTEGER NOT NULL,
    "quantidadeContada" INTEGER,
    "saldoNoFecho" INTEGER,
    "deltaAplicado" INTEGER,

    CONSTRAINT "BalancoEstoqueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BalancoEstoque_storeId_numero_key" ON "BalancoEstoque"("storeId", "numero");

-- CreateIndex
CREATE INDEX "BalancoEstoque_tenantId_storeId_idx" ON "BalancoEstoque"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "BalancoEstoque_tenantId_createdAt_idx" ON "BalancoEstoque"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BalancoEstoqueItem_balancoId_produtoVariacaoId_key" ON "BalancoEstoqueItem"("balancoId", "produtoVariacaoId");

-- CreateIndex
CREATE INDEX "BalancoEstoqueItem_balancoId_idx" ON "BalancoEstoqueItem"("balancoId");

-- CreateIndex
CREATE INDEX "BalancoEstoqueItem_produtoVariacaoId_idx" ON "BalancoEstoqueItem"("produtoVariacaoId");

-- AddForeignKey
ALTER TABLE "BalancoEstoque" ADD CONSTRAINT "BalancoEstoque_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalancoEstoque" ADD CONSTRAINT "BalancoEstoque_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalancoEstoque" ADD CONSTRAINT "BalancoEstoque_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalancoEstoqueItem" ADD CONSTRAINT "BalancoEstoqueItem_balancoId_fkey" FOREIGN KEY ("balancoId") REFERENCES "BalancoEstoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalancoEstoqueItem" ADD CONSTRAINT "BalancoEstoqueItem_produtoVariacaoId_fkey" FOREIGN KEY ("produtoVariacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
