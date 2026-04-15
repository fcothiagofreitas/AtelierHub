-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "entregueEm" TIMESTAMP(3),
ADD COLUMN     "entreguePorId" TEXT;

-- CreateIndex
CREATE INDEX "Pedido_entregueEm_idx" ON "Pedido"("entregueEm");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_entreguePorId_fkey" FOREIGN KEY ("entreguePorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MovimentoCorretor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "corretorId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoCorretor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovimentoCorretor_pedidoId_key" ON "MovimentoCorretor"("pedidoId");

-- CreateIndex
CREATE INDEX "MovimentoCorretor_tenantId_idx" ON "MovimentoCorretor"("tenantId");

-- CreateIndex
CREATE INDEX "MovimentoCorretor_corretorId_idx" ON "MovimentoCorretor"("corretorId");

-- AddForeignKey
ALTER TABLE "MovimentoCorretor" ADD CONSTRAINT "MovimentoCorretor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCorretor" ADD CONSTRAINT "MovimentoCorretor_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Corretor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCorretor" ADD CONSTRAINT "MovimentoCorretor_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
