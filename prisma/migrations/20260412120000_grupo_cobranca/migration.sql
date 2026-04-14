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

-- CreateIndex
CREATE INDEX "GrupoCobranca_tenantId_storeId_idx" ON "GrupoCobranca"("tenantId", "storeId");
CREATE INDEX "GrupoCobranca_tenantId_clienteId_idx" ON "GrupoCobranca"("tenantId", "clienteId");
CREATE INDEX "GrupoCobranca_tenantId_corretorId_idx" ON "GrupoCobranca"("tenantId", "corretorId");

-- AddForeignKey
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Corretor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrupoCobranca" ADD CONSTRAINT "GrupoCobranca_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
