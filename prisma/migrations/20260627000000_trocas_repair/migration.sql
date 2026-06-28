-- Repair migration: garante que tudo da migration 20260512120000_trocas está aplicado,
-- independentemente do estado parcial que ficou no banco de staging após a falha.

DO $$ BEGIN
  CREATE TYPE "TrocaEstado" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "MovimentoEstoqueTipo" ADD VALUE IF NOT EXISTS 'TROCA_ENTRADA';
ALTER TYPE "PedidoModalidade" ADD VALUE IF NOT EXISTS 'TROCA';

ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "creditoTroca" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Pedido"
  ADD COLUMN IF NOT EXISTS "observacoes" TEXT,
  ADD COLUMN IF NOT EXISTS "trocaOrigemId" TEXT;

CREATE TABLE IF NOT EXISTS "Troca" (
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

CREATE TABLE IF NOT EXISTS "TrocaItem" (
    "id" TEXT NOT NULL,
    "trocaId" TEXT NOT NULL,
    "produtoVariacaoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrocaItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Troca_tenantId_idx" ON "Troca"("tenantId");
CREATE INDEX IF NOT EXISTS "Troca_tenantId_storeId_idx" ON "Troca"("tenantId", "storeId");
CREATE INDEX IF NOT EXISTS "Troca_tenantId_createdAt_idx" ON "Troca"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Troca_clienteId_idx" ON "Troca"("clienteId");
CREATE INDEX IF NOT EXISTS "Troca_vendedorId_idx" ON "Troca"("vendedorId");
CREATE UNIQUE INDEX IF NOT EXISTS "Troca_storeId_numero_key" ON "Troca"("storeId", "numero");
CREATE INDEX IF NOT EXISTS "TrocaItem_trocaId_idx" ON "TrocaItem"("trocaId");
CREATE INDEX IF NOT EXISTS "TrocaItem_produtoVariacaoId_idx" ON "TrocaItem"("produtoVariacaoId");
CREATE UNIQUE INDEX IF NOT EXISTS "Pedido_trocaOrigemId_key" ON "Pedido"("trocaOrigemId");

DO $$ BEGIN
  ALTER TABLE "Troca" ADD CONSTRAINT "Troca_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Troca" ADD CONSTRAINT "Troca_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Troca" ADD CONSTRAINT "Troca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Troca" ADD CONSTRAINT "Troca_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Colaborador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_trocaId_fkey" FOREIGN KEY ("trocaId") REFERENCES "Troca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_produtoVariacaoId_fkey" FOREIGN KEY ("produtoVariacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_trocaOrigemId_fkey" FOREIGN KEY ("trocaOrigemId") REFERENCES "Troca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
