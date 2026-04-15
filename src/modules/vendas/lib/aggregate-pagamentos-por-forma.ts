import type { FormaPagamento } from "@prisma/client";
import { formasPagamentoOrdem } from "@/modules/vendas/lib/labels";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Uma linha por forma de pagamento (soma de todos os lançamentos dessa forma).
 * Para UI onde vários recebimentos na mesma forma devem aparecer agregados.
 */
export function aggregatePagamentosPorForma(
  rows: Array<{ forma: FormaPagamento; valor: number }>,
): Array<{ id: string; forma: FormaPagamento; valor: number }> {
  const sum = new Map<FormaPagamento, number>();
  for (const r of rows) {
    sum.set(r.forma, (sum.get(r.forma) ?? 0) + r.valor);
  }
  return formasPagamentoOrdem
    .filter((f) => (sum.get(f) ?? 0) > 0.0001)
    .map((forma) => ({
      id: `agg-${forma}`,
      forma,
      valor: roundMoney(sum.get(forma) ?? 0),
    }));
}
