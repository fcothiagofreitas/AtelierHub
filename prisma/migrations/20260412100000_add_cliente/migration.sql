-- CreateEnum
CREATE TYPE "ClienteTipo" AS ENUM ('PF', 'PJ');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tipo" "ClienteTipo" NOT NULL,
    "nome" TEXT,
    "cpf" TEXT,
    "aniversario" TIMESTAMP(3),
    "fantasia" TEXT,
    "razaoSocial" TEXT,
    "cnpj" TEXT,
    "ie" TEXT,
    "ieIsento" BOOLEAN NOT NULL DEFAULT false,
    "responsavelNome" TEXT,
    "responsavelFone" TEXT,
    "endereco" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "creditLimit" DECIMAL(14,2),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "corretorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cliente_tenantId_idx" ON "Cliente"("tenantId");
CREATE INDEX "Cliente_storeId_idx" ON "Cliente"("storeId");
CREATE INDEX "Cliente_tenantId_cpf_idx" ON "Cliente"("tenantId", "cpf");
CREATE INDEX "Cliente_tenantId_cnpj_idx" ON "Cliente"("tenantId", "cnpj");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "Corretor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
