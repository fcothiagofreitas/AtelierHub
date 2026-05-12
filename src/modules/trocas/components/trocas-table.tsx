import { formatDateBr } from "@/lib/format-date-br";
import type { TrocaListaRow } from "@/modules/trocas/trocas-queries";
import { trocaTipoFluxoLabel } from "@/modules/trocas/trocas-labels";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Props = {
  rows: TrocaListaRow[];
};

export function TrocasTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma troca registada ainda.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">N.º</th>
            <th className="px-4 py-3 text-left font-medium">Data</th>
            <th className="px-4 py-3 text-left font-medium">Cliente</th>
            <th className="px-4 py-3 text-left font-medium">Tipo</th>
            <th className="px-4 py-3 text-right font-medium">Crédito</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="bg-card hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{r.numero}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {formatDateBr(r.createdAt)}
              </td>
              <td className="px-4 py-3">{r.clienteNome}</td>
              <td className="px-4 py-3">{trocaTipoFluxoLabel(r.tipoFluxo)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {money.format(Number(r.valorCredito.toString()))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
