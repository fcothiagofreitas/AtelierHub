"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PedidoEstado, PedidoModalidade } from "@prisma/client";
import {
  pedidoModalidadeLabels,
} from "@/modules/vendas/lib/labels";
import { PedidoEstadoBadge } from "@/modules/vendas/components/pedido-estado-badge";
import { buildVendasHref } from "@/modules/vendas/lib/build-href";
import { formatDateBr } from "@/lib/format-date-br";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type VendasPedidoRowVm = {
  id: string;
  numero: number;
  createdAt: string;
  estado: PedidoEstado;
  modalidade: PedidoModalidade;
  total: number | null;
  clienteLabel: string;
  vendedorName: string;
  corretorName: string;
};

type Props = {
  pedidos: VendasPedidoRowVm[];
  /** Query string dos filtros actuais (para preservar na navegação). */
  filterQueryString: string;
};

export function VendasPedidosTable({ pedidos, filterQueryString }: Props) {
  const router = useRouter();
  const sp = React.useMemo(
    () => new URLSearchParams(filterQueryString),
    [filterQueryString],
  );

  const hrefParaPedido = React.useCallback(
    (p: VendasPedidoRowVm) => {
      if (p.estado === "EM_ANDAMENTO") {
        return buildVendasHref(sp, { pdv: "1", edit: p.id, view: null });
      }
      if (
        p.estado === "EM_ABERTO" ||
        p.estado === "PAGO_PARCIAL" ||
        p.estado === "QUITADO"
      ) {
        return buildVendasHref(sp, {
          pdv: "1",
          view: p.id,
          edit: null,
          pagamento: "1",
        });
      }
      return buildVendasHref(sp, { pdv: "1", view: p.id, edit: null });
    },
    [sp],
  );

  const abrir = React.useCallback(
    (p: VendasPedidoRowVm) => {
      router.push(hrefParaPedido(p));
    },
    [router, hrefParaPedido],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Nº</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Vendedor</th>
            <th className="px-4 py-3 font-medium">Corretor</th>
            <th className="px-4 py-3 text-left font-medium">Estado</th>
            <th className="px-4 py-3 text-left font-medium">Modalidade</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {pedidos.map((p) => (
            <tr
              key={p.id}
              role="link"
              tabIndex={0}
              className={cn(
                "bg-card cursor-pointer transition-colors",
                "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              onClick={() => abrir(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  abrir(p);
                }
              }}
              aria-label={`Abrir pedido nº ${p.numero}`}
            >
              <td className="px-4 py-3 font-mono tabular-nums">{p.numero}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateBr(p.createdAt)}
              </td>
              <td className="px-4 py-3 font-medium">{p.clienteLabel}</td>
              <td className="px-4 py-3">{p.vendedorName}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.corretorName}</td>
              <td className="px-4 py-3 text-left align-middle">
                <PedidoEstadoBadge estado={p.estado} />
              </td>
              <td className="px-4 py-3 text-left text-muted-foreground">
                {pedidoModalidadeLabels[p.modalidade]}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {p.total != null ? money.format(p.total) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
