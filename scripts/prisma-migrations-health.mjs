#!/usr/bin/env node
/**
 * Diagnóstico rápido para P3009 / histórico de migrações.
 * Uso: node --env-file=.env scripts/prisma-migrations-health.mjs
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const rows = await p.$queryRaw`
    SELECT migration_name,
           finished_at,
           rolled_back_at,
           started_at,
           CASE WHEN logs IS NULL OR logs = '' THEN NULL ELSE left(logs::text, 160) END AS logs_snip
    FROM "_prisma_migrations"
    ORDER BY started_at
  `;

  /** Bloqueiam migrate deploy (P3009): sem conclusão e sem rollback registado. */
  const stuck = rows.filter(
    (r) => r.finished_at == null && r.rolled_back_at == null,
  );
  console.log(
    "=== Migrações em falha activa (finished_at NULL e rolled_back_at NULL) — causa típica de P3009 ===",
  );
  if (stuck.length === 0) {
    console.log("(nenhuma — OK para migrate deploy)\n");
  } else {
    console.table(stuck);
    console.log("");
  }

  const unfinishedButRolled = rows.filter(
    (r) => r.finished_at == null && r.rolled_back_at != null,
  );
  console.log(
    "=== Histórico: tentativas falhadas já com rollback (não bloqueiam) ===",
  );
  if (unfinishedButRolled.length === 0) {
    console.log("(nenhuma)\n");
  } else {
    console.table(unfinishedButRolled);
    console.log("");
  }

  console.log("\n=== Objectos esperados (grupo cobrança + observações pedido) ===");
  const [chk] = await p.$queryRaw`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'GrupoCobrancaPedido'
      ) AS "GrupoCobrancaPedido",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Pagamento' AND column_name = 'grupoCobrancaId'
      ) AS "Pagamento.grupoCobrancaId",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Pedido' AND column_name = 'observacoes'
      ) AS "Pedido.observacoes"
  `;
  console.table(chk);

  console.log(
    "\nSe P3009 persistir: na secção «falha activa» acima, confirme o SQL em prisma/migrations/…;",
    "alinhe a BD; depois: npx prisma migrate resolve --applied \"<nome>\" OU --rolled-back \"<nome>\";",
    "e npx prisma migrate deploy. Em dev, dados descartáveis: npm run db:reset.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
