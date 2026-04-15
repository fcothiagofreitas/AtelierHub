-- CreateTable
CREATE TABLE "GradeTamanho" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeTamanho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcaoTamanho" (
    "id" TEXT NOT NULL,
    "gradeTamanhoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpcaoTamanho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeTamanho_tenantId_idx" ON "GradeTamanho"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeTamanho_tenantId_slug_key" ON "GradeTamanho"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "OpcaoTamanho_gradeTamanhoId_idx" ON "OpcaoTamanho"("gradeTamanhoId");

-- CreateIndex
CREATE UNIQUE INDEX "OpcaoTamanho_gradeTamanhoId_slug_key" ON "OpcaoTamanho"("gradeTamanhoId", "slug");

-- AddForeignKey
ALTER TABLE "GradeTamanho" ADD CONSTRAINT "GradeTamanho_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcaoTamanho" ADD CONSTRAINT "OpcaoTamanho_gradeTamanhoId_fkey" FOREIGN KEY ("gradeTamanhoId") REFERENCES "GradeTamanho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrar dados de CatalogoTamanho: uma grade "Padrão" por tenant que tinha tamanhos
INSERT INTO "GradeTamanho" ("id", "tenantId", "nome", "slug", "ordem", "isActive", "createdAt", "updatedAt")
SELECT
  'grade_seed_' || c."tenantId",
  c."tenantId",
  'Padrão',
  'padrao',
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "CatalogoTamanho" c
GROUP BY c."tenantId";

INSERT INTO "OpcaoTamanho" ("id", "gradeTamanhoId", "nome", "slug", "ordem", "isActive", "createdAt", "updatedAt")
SELECT
  c."id",
  'grade_seed_' || c."tenantId",
  c."nome",
  c."slug",
  c."ordem",
  c."isActive",
  c."createdAt",
  c."updatedAt"
FROM "CatalogoTamanho" c;

-- Produto: coluna grade
ALTER TABLE "Produto" ADD COLUMN "gradeTamanhoId" TEXT;

UPDATE "Produto" p
SET "gradeTamanhoId" = 'grade_seed_' || p."tenantId"
WHERE EXISTS (
  SELECT 1 FROM "ProdutoVariacao" v
  WHERE v."produtoId" = p."id" AND v."tamanhoCatalogoId" IS NOT NULL
);

CREATE INDEX "Produto_gradeTamanhoId_idx" ON "Produto"("gradeTamanhoId");

ALTER TABLE "Produto" ADD CONSTRAINT "Produto_gradeTamanhoId_fkey" FOREIGN KEY ("gradeTamanhoId") REFERENCES "GradeTamanho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Variação: opcao em vez de catalogo tamanho
ALTER TABLE "ProdutoVariacao" ADD COLUMN "opcaoTamanhoId" TEXT;

UPDATE "ProdutoVariacao" v
SET "opcaoTamanhoId" = v."tamanhoCatalogoId"
WHERE v."tamanhoCatalogoId" IS NOT NULL;

ALTER TABLE "ProdutoVariacao" DROP CONSTRAINT "ProdutoVariacao_tamanhoCatalogoId_fkey";

DROP INDEX IF EXISTS "ProdutoVariacao_tamanhoCatalogoId_idx";

ALTER TABLE "ProdutoVariacao" DROP COLUMN "tamanhoCatalogoId";

CREATE INDEX "ProdutoVariacao_opcaoTamanhoId_idx" ON "ProdutoVariacao"("opcaoTamanhoId");

ALTER TABLE "ProdutoVariacao" ADD CONSTRAINT "ProdutoVariacao_opcaoTamanhoId_fkey" FOREIGN KEY ("opcaoTamanhoId") REFERENCES "OpcaoTamanho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "CatalogoTamanho";
