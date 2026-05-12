-- AlterEnum: novo tipo de fluxo
ALTER TYPE "TrocaTipoFluxo" ADD VALUE 'TROCA_INDEPENDENTE';

-- Trocas sem pedido de origem obrigatório
ALTER TABLE "Troca" ALTER COLUMN "pedidoOrigemId" DROP NOT NULL;

-- Linhas de troca por catálogo ou pedido (legado)
ALTER TABLE "TrocaItem" ALTER COLUMN "pedidoItemId" DROP NOT NULL;

ALTER TABLE "TrocaItem" ADD COLUMN "produtoVariacaoId" TEXT;

CREATE INDEX "TrocaItem_produtoVariacaoId_idx" ON "TrocaItem"("produtoVariacaoId");

ALTER TABLE "TrocaItem" ADD CONSTRAINT "TrocaItem_produtoVariacaoId_fkey" FOREIGN KEY ("produtoVariacaoId") REFERENCES "ProdutoVariacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
