-- Depende de Pedido (20260419120000) e Pagamento (20260420120000).
CREATE TABLE "GrupoCobrancaPedido" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GrupoCobrancaPedido_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN "grupoCobrancaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GrupoCobrancaPedido_grupoId_pedidoId_key" ON "GrupoCobrancaPedido"("grupoId", "pedidoId");
CREATE INDEX "GrupoCobrancaPedido_pedidoId_idx" ON "GrupoCobrancaPedido"("pedidoId");

CREATE INDEX "Pagamento_grupoCobrancaId_idx" ON "Pagamento"("grupoCobrancaId");

-- AddForeignKey
ALTER TABLE "GrupoCobrancaPedido" ADD CONSTRAINT "GrupoCobrancaPedido_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoCobranca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoCobrancaPedido" ADD CONSTRAINT "GrupoCobrancaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_grupoCobrancaId_fkey" FOREIGN KEY ("grupoCobrancaId") REFERENCES "GrupoCobranca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
