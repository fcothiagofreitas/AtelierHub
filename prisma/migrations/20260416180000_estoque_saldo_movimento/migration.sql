-- CreateEnum
CREATE TYPE "MovimentoEstoqueTipo" AS ENUM ('ENTRADA_MANUAL', 'SAIDA_DEFEITO', 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_CONFERENCIA');

-- CreateTable
CREATE TABLE "EstoqueSaldo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "produtoVariacaoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueSaldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "produtoVariacaoId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "tipo" "MovimentoEstoqueTipo" NOT NULL,
    "motivo" TEXT,
    "userId" TEXT,
    "loteTransferenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstoqueSaldo_tenantId_idx" ON "EstoqueSaldo"("tenantId");

-- CreateIndex
CREATE INDEX "EstoqueSaldo_tenantId_storeId_idx" ON "EstoqueSaldo"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "EstoqueSaldo_produtoVariacaoId_idx" ON "EstoqueSaldo"("produtoVariacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueSaldo_storeId_produtoVariacaoId_key" ON "EstoqueSaldo"("storeId", "produtoVariacaoId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_tenantId_idx" ON "MovimentoEstoque"("tenantId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_tenantId_storeId_idx" ON "MovimentoEstoque"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_tenantId_produtoVariacaoId_idx" ON "MovimentoEstoque"("tenantId", "produtoVariacaoId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_tenantId_createdAt_idx" ON "MovimentoEstoque"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_loteTransferenciaId_idx" ON "MovimentoEstoque"("loteTransferenciaId");

-- AddForeignKey
ALTER TABLE "EstoqueSaldo" ADD CONSTRAINT "EstoqueSaldo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueSaldo" ADD CONSTRAINT "EstoqueSaldo_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueSaldo" ADD CONSTRAINT "EstoqueSaldo_produtoVariacaoId_fkey" FOREIGN KEY ("produtoVariacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_produtoVariacaoId_fkey" FOREIGN KEY ("produtoVariacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
