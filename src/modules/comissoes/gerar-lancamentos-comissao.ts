import { ComissaoTipo, Prisma } from "@prisma/client";

function moneyMulPercent(base: Prisma.Decimal, percent: number): Prisma.Decimal {
  if (percent <= 0) return new Prisma.Decimal(0);
  return base.mul(new Prisma.Decimal(percent)).div(100).toDecimalPlaces(2);
}

/**
 * Gera lançamentos de comissão quando o pedido fica quitado.
 * Idempotente: se já existir lançamento para o pedido, não duplica.
 *
 * Vendedor: `minCommission` do colaborador se &gt; 0; senão `percentualComissaoVendedorPadrao` do tenant.
 * Corretor: `commissionPercent` do corretor (só se o pedido tiver corretor e percentual &gt; 0).
 */
export async function gerarLancamentosComissaoPedidoQuitado(
  tx: Prisma.TransactionClient,
  pedidoId: string,
): Promise<void> {
  const pedido = await tx.pedido.findUnique({
    where: { id: pedidoId },
    select: {
      id: true,
      tenantId: true,
      storeId: true,
      total: true,
      vendedorId: true,
      corretorId: true,
    },
  });
  if (!pedido?.total) return;

  const base = pedido.total;

  const [tenant, vendedor, corretor] = await Promise.all([
    tx.tenant.findUnique({
      where: { id: pedido.tenantId },
      select: { percentualComissaoVendedorPadrao: true },
    }),
    tx.colaborador.findUnique({
      where: { id: pedido.vendedorId },
      select: { minCommission: true },
    }),
    pedido.corretorId
      ? tx.corretor.findUnique({
          where: { id: pedido.corretorId },
          select: { commissionPercent: true },
        })
      : Promise.resolve(null),
  ]);

  const pctVendedor =
    (vendedor?.minCommission ?? 0) > 0
      ? vendedor!.minCommission
      : (tenant?.percentualComissaoVendedorPadrao ?? 0);
  const valorVendedor = moneyMulPercent(base, pctVendedor);

  const existentes = await tx.lancamentoComissao.findMany({
    where: { pedidoId },
    select: { tipo: true },
  });
  const jaTem = new Set(existentes.map((r) => r.tipo));

  const rows: Prisma.LancamentoComissaoCreateManyInput[] = [];

  if (
    !jaTem.has(ComissaoTipo.VENDEDOR) &&
    pctVendedor > 0 &&
    valorVendedor.gt(0)
  ) {
    rows.push({
      tenantId: pedido.tenantId,
      storeId: pedido.storeId,
      pedidoId: pedido.id,
      tipo: ComissaoTipo.VENDEDOR,
      colaboradorId: pedido.vendedorId,
      corretorId: null,
      baseCalculo: base,
      percentual: pctVendedor,
      valor: valorVendedor,
    });
  }

  if (
    pedido.corretorId &&
    corretor &&
    corretor.commissionPercent > 0 &&
    !jaTem.has(ComissaoTipo.CORRETOR)
  ) {
    const valorC = moneyMulPercent(base, corretor.commissionPercent);
    if (valorC.gt(0)) {
      rows.push({
        tenantId: pedido.tenantId,
        storeId: pedido.storeId,
        pedidoId: pedido.id,
        tipo: ComissaoTipo.CORRETOR,
        colaboradorId: null,
        corretorId: pedido.corretorId,
        baseCalculo: base,
        percentual: corretor.commissionPercent,
        valor: valorC,
      });
    }
  }

  if (rows.length > 0) {
    await tx.lancamentoComissao.createMany({ data: rows });
  }
}
