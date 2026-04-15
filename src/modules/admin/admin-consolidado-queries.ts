import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { countSkusComSaldoPositivo } from "@/modules/estoque/estoque-db-helpers";

const TOP_LOJAS = 5;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function decimalSumToNumber(v: Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return Number(v.toFixed(2));
}

export type AdminConsolidadoSnapshot = {
  vendas: {
    /** Pedidos criados nos últimos 7 dias (excl. cancelados). */
    pedidosUltimos7Dias: number;
    /** Pedidos criados nos últimos 30 dias (excl. cancelados). */
    pedidosUltimos30Dias: number;
    /** PDV / rascunho ainda não finalizado. */
    pedidosEmAndamento: number;
    /** Com saldo a receber (estados financeiros abertos). */
    pedidosComPagamentoAberto: number;
    pedidosQuitadosUltimos7Dias: number;
    pedidosQuitadosUltimos30Dias: number;
    valorQuitadoUltimos7Dias: number;
    valorQuitadoUltimos30Dias: number;
  };
  estoque: {
    skusComSaldoPositivo: number;
    quantidadeTotalPecas: number;
    topLojasPorPecas: { storeId: string; storeName: string; quantidade: number }[];
  };
  pendencias: {
    balancosRascunho: number;
    /** Grupos de cobrança registados (lotes em aberto na operação). */
    gruposCobranca: number;
  };
};

/**
 * Métricas ao nível do tenant para o painel administrativo (Sprint 14).
 * Não expõe dados cruzados entre lojas na UI operacional — aqui só agregados para visão da marca.
 */
export async function getAdminConsolidadoSnapshot(
  tenantId: string,
): Promise<AdminConsolidadoSnapshot> {
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  const notCancelado: Prisma.PedidoWhereInput = {
    estado: { not: "CANCELADO" },
  };

  const [
    pedidosUltimos7Dias,
    pedidosUltimos30Dias,
    pedidosEmAndamento,
    pedidosComPagamentoAberto,
    pedidosQuitados7,
    pedidosQuitados30,
    sumQuitados7,
    sumQuitados30,
    skusComSaldoPositivo,
    sumQty,
    topGroups,
    balancosRascunho,
    gruposCobranca,
  ] = await Promise.all([
    prisma.pedido.count({
      where: { tenantId, createdAt: { gte: d7 }, ...notCancelado },
    }),
    prisma.pedido.count({
      where: { tenantId, createdAt: { gte: d30 }, ...notCancelado },
    }),
    prisma.pedido.count({
      where: { tenantId, estado: "EM_ANDAMENTO" },
    }),
    prisma.pedido.count({
      where: {
        tenantId,
        estado: { in: ["EM_ABERTO", "PAGO_PARCIAL"] },
      },
    }),
    prisma.pedido.count({
      where: { tenantId, estado: "QUITADO", createdAt: { gte: d7 } },
    }),
    prisma.pedido.count({
      where: { tenantId, estado: "QUITADO", createdAt: { gte: d30 } },
    }),
    prisma.pedido.aggregate({
      where: { tenantId, estado: "QUITADO", createdAt: { gte: d7 } },
      _sum: { total: true },
    }),
    prisma.pedido.aggregate({
      where: { tenantId, estado: "QUITADO", createdAt: { gte: d30 } },
      _sum: { total: true },
    }),
    countSkusComSaldoPositivo(tenantId),
    prisma.estoqueSaldo.aggregate({
      where: { tenantId },
      _sum: { quantidade: true },
    }),
    prisma.estoqueSaldo.groupBy({
      by: ["storeId"],
      where: { tenantId },
      _sum: { quantidade: true },
      orderBy: { _sum: { quantidade: "desc" } },
      take: TOP_LOJAS,
    }),
    prisma.balancoEstoque.count({
      where: { tenantId, estado: "RASCUNHO" },
    }),
    prisma.grupoCobranca.count({
      where: { tenantId },
    }),
  ]);

  const storeIds = topGroups.map((g) => g.storeId);
  const stores =
    storeIds.length > 0
      ? await prisma.store.findMany({
          where: { id: { in: storeIds }, tenantId },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(stores.map((s) => [s.id, s.name]));

  const topLojasPorPecas = topGroups.map((g) => ({
    storeId: g.storeId,
    storeName: nameById.get(g.storeId) ?? g.storeId,
    quantidade: g._sum.quantidade ?? 0,
  }));

  return {
    vendas: {
      pedidosUltimos7Dias,
      pedidosUltimos30Dias,
      pedidosEmAndamento,
      pedidosComPagamentoAberto,
      pedidosQuitadosUltimos7Dias: pedidosQuitados7,
      pedidosQuitadosUltimos30Dias: pedidosQuitados30,
      valorQuitadoUltimos7Dias: decimalSumToNumber(sumQuitados7._sum.total),
      valorQuitadoUltimos30Dias: decimalSumToNumber(sumQuitados30._sum.total),
    },
    estoque: {
      skusComSaldoPositivo,
      quantidadeTotalPecas: sumQty._sum.quantidade ?? 0,
      topLojasPorPecas,
    },
    pendencias: {
      balancosRascunho,
      gruposCobranca,
    },
  };
}
