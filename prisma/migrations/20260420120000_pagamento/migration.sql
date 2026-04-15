-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'PIX', 'TRANSFERENCIA', 'OUTROS');

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "obs" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pagamento_pedidoId_idx" ON "Pagamento"("pedidoId");

-- CreateIndex
CREATE INDEX "Pagamento_tenantId_idx" ON "Pagamento"("tenantId");

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
