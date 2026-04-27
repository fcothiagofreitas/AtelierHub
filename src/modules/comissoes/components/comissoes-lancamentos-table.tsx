import type { ComissaoTipo } from "@prisma/client";
import { formatDateBr } from "@/lib/format-date-br";
import type { LancamentoComissaoListRow } from "@/modules/comissoes/comissoes-queries";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function tipoLabel(t: ComissaoTipo) {
  return t === "VENDEDOR" ? "Vendedor" : "Corretor";
}

type Props = {
  rows: LancamentoComissaoListRow[];
};

export function ComissoesLancamentosTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nenhum lançamento no período com os filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Data</th>
            <th className="px-4 py-3 text-left font-medium">Pedido</th>
            <th className="px-4 py-3 text-left font-medium">Loja</th>
            <th className="px-4 py-3 text-left font-medium">Tipo</th>
            <th className="px-4 py-3 text-left font-medium">Beneficiário</th>
            <th className="px-4 py-3 text-right font-medium">Base</th>
            <th className="px-4 py-3 text-right font-medium">%</th>
            <th className="px-4 py-3 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="bg-card hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDateBr(r.createdAt)}
              </td>
              <td className="px-4 py-3 font-medium">#{r.pedidoNumero}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.storeName}</td>
              <td className="px-4 py-3">{tipoLabel(r.tipo)}</td>
              <td className="px-4 py-3">{r.beneficiarioNome}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {money.format(Number(r.baseCalculo.toString()))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.percentual.toLocaleString("pt-BR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {money.format(Number(r.valor.toString()))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
