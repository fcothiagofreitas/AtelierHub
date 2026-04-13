-- CreateEnum
CREATE TYPE "GrupoCobrancaTipo" AS ENUM ('CLIENTE', 'CORRETOR');

-- CreateTable
CREATE TABLE "GrupoCobranca" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tipo" "GrupoCobrancaTipo" NOT NULL,
    "clienteId" TEXT,
    "corretorId" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoCobranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
CREATE INDEX "GrupoCobranca_tenantId_storeId_idx" ON "GrupoCobranca"("tenantId", "storeId");
CREATE INDEX "GrupoCobranca_tenantId_clienteId_idx" ON "GrupoCobranca"("tenantId", "clienteId");
CREATE INDEX "GrupoCobranca_tenantId_corretorId_idx" ON "GrupoCobranca"("tenantId", "corretorId");

CREATE UNIQUE INDEX "GrupoCobrancaPedido_grupoId_pedidoId_key" ON "GrupoCobrancaPedido"("grupoId", "pedidoId");
CREATE INDEX "GrupoCobrancaPedido_pedidoId_idx" ON "GrupoCobrancaPedido"("pedidoId");

CREATE INDEX "Pagamento_grupoCobrancaId_idx" ON "Pagamento"("grupoCobrancaId");

-- AddForeignKey
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Corretor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrupoCobrancaPedido" ADD CONSTRAINT "GrupoCobrancaPedido_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoCobranca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoCobrancaPedido" ADD CONSTRAINT "GrupoCobrancaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_grupoCobrancaId_fkey" FOREIGN KEY ("grupoCobrancaId") REFERENCES "GrupoCobranca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
