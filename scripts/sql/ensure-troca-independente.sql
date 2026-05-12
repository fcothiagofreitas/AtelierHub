-- Reparação completa para trocas por catálogo (schema Prisma vs base antiga).
-- Uso: npm run db:repair-troca
-- Idempotente.

ALTER TABLE "Troca" ALTER COLUMN "pedidoOrigemId" DROP NOT NULL;
ALTER TABLE "TrocaItem" ALTER COLUMN "pedidoItemId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TrocaTipoFluxo'
      AND e.enumlabel = 'TROCA_INDEPENDENTE'
  ) THEN
    ALTER TYPE "TrocaTipoFluxo" ADD VALUE 'TROCA_INDEPENDENTE';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TrocaItem'
      AND column_name = 'produtoVariacaoId'
  ) THEN
    ALTER TABLE "TrocaItem" ADD COLUMN "produtoVariacaoId" TEXT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "TrocaItem_produtoVariacaoId_idx" ON "TrocaItem"("produtoVariacaoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'TrocaItem'
      AND constraint_name = 'TrocaItem_produtoVariacaoId_fkey'
  ) THEN
    ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_produtoVariacaoId_fkey"
      FOREIGN KEY ("produtoVariacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
