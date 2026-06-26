"use client";

import { useRouter } from "next/navigation";
import type { TrocaEstado } from "@prisma/client";
import { TrocaEstadoBadge } from "@/modules/trocas/components/troca-estado-badge";
import { formatDateBr } from "@/lib/format-date-br";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export type TrocasTableRow = {
  id: string;
  numero: number;
  estado: TrocaEstado;
  clienteNome: string;
  vendedorNome: string;
  creditoGerado: number;
  creditoConsumido: number;
  creditoRemanescente: number;
  pedidoSaidaId: string | null;
  createdAt: string;
};

type Props = {
  trocas: TrocasTableRow[];
};

export function TrocasTable({ trocas }: Props) {
  const router = useRouter();

  if (trocas.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma troca encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2.5 font-medium">Nº</th>
            <th className="px-3 py-2.5 font-medium">Data</th>
            <th className="px-3 py-2.5 font-medium">Estado</th>
            <th className="px-3 py-2.5 font-medium">Cliente</th>
            <th className="px-3 py-2.5 font-medium">Vendedor</th>
            <th className="px-3 py-2.5 text-right font-medium">Crédito gerado</th>
            <th className="px-3 py-2.5 text-right font-medium">Remanescente</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {trocas.map((t) => (
            <tr
              key={t.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => router.push(`/trocas?pdv=1&view=${t.id}`)}
            >
              <td className="px-3 py-2.5 font-medium tabular-nums text-primary">
                #{t.numero}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {formatDateBr(t.createdAt)}
              </td>
              <td className="px-3 py-2.5">
                <TrocaEstadoBadge estado={t.estado} />
              </td>
              <td className="px-3 py-2.5">{t.clienteNome}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{t.vendedorNome}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 font-medium">
                {BRL.format(t.creditoGerado)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-sky-600">
                {t.creditoRemanescente > 0.004 ? BRL.format(t.creditoRemanescente) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
