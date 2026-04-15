import { prisma } from "@/lib/prisma";

/**
 * Conta SKUs (linhas de saldo) com quantidade &gt; 0 no tenant.
 * Usa `$queryRaw` em vez de `prisma.estoqueSaldo` porque, em dev, o `PrismaClient`
 * em `globalThis` pode ficar desatualizado após `prisma generate` (HMR não recria o
 * singleton — `estoqueSaldo` fica `undefined` até reiniciar o servidor).
 */
export async function countSkusComSaldoPositivo(tenantId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c
    FROM "EstoqueSaldo"
    WHERE "tenantId" = ${tenantId} AND "quantidade" > 0
  `;
  return Number(rows[0]?.c ?? 0);
}
