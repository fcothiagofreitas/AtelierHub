-- CreateTable
CREATE TABLE "CatalogoTamanho" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoTamanho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoCor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoCor_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "precoVenda" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "ProdutoVariacao" ADD COLUMN     "tamanhoCatalogoId" TEXT,
ADD COLUMN     "corCatalogoId" TEXT;

-- CreateIndex
CREATE INDEX "CatalogoTamanho_tenantId_idx" ON "CatalogoTamanho"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoTamanho_tenantId_slug_key" ON "CatalogoTamanho"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "CatalogoCor_tenantId_idx" ON "CatalogoCor"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoCor_tenantId_slug_key" ON "CatalogoCor"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ProdutoVariacao_tamanhoCatalogoId_idx" ON "ProdutoVariacao"("tamanhoCatalogoId");

-- CreateIndex
CREATE INDEX "ProdutoVariacao_corCatalogoId_idx" ON "ProdutoVariacao"("corCatalogoId");

-- AddForeignKey
ALTER TABLE "CatalogoTamanho" ADD CONSTRAINT "CatalogoTamanho_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoCor" ADD CONSTRAINT "CatalogoCor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoVariacao" ADD CONSTRAINT "ProdutoVariacao_tamanhoCatalogoId_fkey" FOREIGN KEY ("tamanhoCatalogoId") REFERENCES "CatalogoTamanho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoVariacao" ADD CONSTRAINT "ProdutoVariacao_corCatalogoId_fkey" FOREIGN KEY ("corCatalogoId") REFERENCES "CatalogoCor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
