#!/usr/bin/env bash
# Reproduz localmente o estado quebrado do banco de staging para testar a repair migration.
# ATENÇÃO: reseta o banco local (atelierhub_dev) completamente.
#
# Uso:
#   bash scripts/simulate-staging-broken-state.sh
#   npx prisma migrate resolve --rolled-back "20260627000000_trocas_repair" 2>/dev/null || true
#   npx prisma migrate deploy

set -e

PSQL="docker compose exec -T db psql -U atelierhub -d atelierhub_dev"

echo "==> [1/5] Resetando banco local..."
npx prisma migrate reset --force --skip-seed

echo "==> [2/5] Removendo tabelas Troca/TrocaItem criadas pela migration normal..."
$PSQL -c 'DROP TABLE IF EXISTS "TrocaItem" CASCADE;'
$PSQL -c 'DROP TABLE IF EXISTS "Troca" CASCADE;'

echo "==> [3/5] Removendo repair migration do histórico (ainda não existe em staging)..."
$PSQL -c "DELETE FROM _prisma_migrations WHERE migration_name = '20260627000000_trocas_repair';"

echo "==> [4/5] Criando Troca SEM 'vendedorId' (estado do db push antigo em staging)..."
$PSQL << 'SQL'
CREATE TABLE "Troca" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "estado" "TrocaEstado" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "creditoGerado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditoConsumido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditoRemanescente" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Troca_pkey" PRIMARY KEY ("id")
);
SQL

echo "==> [5/5] Inserindo repair migration como FAILED (estado atual do staging)..."
$PSQL << 'SQL'
INSERT INTO _prisma_migrations (
    id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
) VALUES (
    gen_random_uuid()::text,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    NULL,
    '20260627000000_trocas_repair',
    'ERROR: column "vendedorId" does not exist',
    NULL,
    NOW() - interval '1 hour',
    0
);
SQL

echo ""
echo "Estado de staging simulado. Rode agora:"
echo ""
echo "  npx prisma migrate resolve --rolled-back '20260627000000_trocas_repair'"
echo "  npx prisma migrate deploy"
echo ""
echo "Se o deploy passar sem erro, a repair migration está correta."
