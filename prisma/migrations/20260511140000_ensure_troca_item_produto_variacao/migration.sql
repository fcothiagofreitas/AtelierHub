-- TrocaItem.produtoVariacaoId (catálogo) — DBs que não aplicaram 20260510120000 por completo.

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
