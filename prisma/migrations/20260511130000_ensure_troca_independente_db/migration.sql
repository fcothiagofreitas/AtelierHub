-- Garante schema para trocas por catálogo (DBs que não aplicaram 20260510120000 por completo).
-- Idempotente: DROP NOT NULL em coluna já nullable não falha no PostgreSQL.

ALTER TABLE "Troca" ALTER COLUMN "pedidoOrigemId" DROP NOT NULL;
ALTER TABLE "TrocaItem" ALTER COLUMN "pedidoItemId" DROP NOT NULL;
