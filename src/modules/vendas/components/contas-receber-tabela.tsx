"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContaReceberClienteRow, ContaReceberCorretorRow } from "@/modules/vendas/cobranca-queries";
import Link from "next/link";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function hrefRecebimentoCliente(clienteId: string) {
  return `/contas-receber/recebimento?tipo=CLIENTE&clienteId=${encodeURIComponent(clienteId)}`;
}

function hrefRecebimentoCorretor(corretorId: string) {
  return `/contas-receber/recebimento?tipo=CORRETOR&corretorId=${encodeURIComponent(corretorId)}`;
}

export function ContasReceberTabelaCliente({
  rows,
}: {
  rows: ContaReceberClienteRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhum saldo em aberto por cliente.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Pedidos</th>
            <th className="px-4 py-3 text-right font-medium">Saldo total</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.clienteId} className="bg-card">
              <td className="px-4 py-3 font-medium">{row.label}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {row.pedidosEmAberto}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {money.format(row.saldoTotal)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={hrefRecebimentoCliente(row.clienteId)}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                  )}
                >
                  Ver pedidos
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContasReceberTabelaCorretor({
  rows,
}: {
  rows: ContaReceberCorretorRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhum saldo em aberto por corretor.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Corretor</th>
            <th className="px-4 py-3 font-medium">Pedidos</th>
            <th className="px-4 py-3 text-right font-medium">Saldo total</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.corretorId} className="bg-card">
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">
                {row.pedidosEmAberto}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {money.format(row.saldoTotal)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={hrefRecebimentoCorretor(row.corretorId)}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                  )}
                >
                  Ver pedidos
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
