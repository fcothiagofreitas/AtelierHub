"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContasReceberReceberLoteDialog } from "@/modules/vendas/components/contas-receber-receber-lote-dialog";
import type { ContaReceberClienteRow, ContaReceberCorretorRow } from "@/modules/vendas/cobranca-queries";
import type { GrupoCobrancaTipo } from "@prisma/client";
import Link from "next/link";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type DialogState = {
  tipo: GrupoCobrancaTipo;
  partyLabel: string;
  clienteId?: string;
  corretorId?: string;
};

export function ContasReceberTabelaCliente({
  storeId,
  rows,
}: {
  storeId: string;
  rows: ContaReceberClienteRow[];
}) {
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const onDialogOpenChange = React.useCallback((o: boolean) => {
    if (!o) setDialog(null);
  }, []);

  if (rows.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhum saldo em aberto por cliente.
      </p>
    );
  }

  return (
    <>
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/vendas?clienteId=${encodeURIComponent(row.clienteId)}&estadoAberto=1`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Ver pedidos
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setDialog({
                          tipo: "CLIENTE",
                          partyLabel: row.label,
                          clienteId: row.clienteId,
                        })
                      }
                    >
                      Receber
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.tipo === "CLIENTE" ? (
        <ContasReceberReceberLoteDialog
          key={dialog.clienteId}
          open
          onOpenChange={onDialogOpenChange}
          storeId={storeId}
          partyLabel={dialog.partyLabel}
          tipo="CLIENTE"
          clienteId={dialog.clienteId}
        />
      ) : null}
    </>
  );
}

export function ContasReceberTabelaCorretor({
  storeId,
  rows,
}: {
  storeId: string;
  rows: ContaReceberCorretorRow[];
}) {
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const onDialogOpenChange = React.useCallback((o: boolean) => {
    if (!o) setDialog(null);
  }, []);

  if (rows.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhum saldo em aberto por corretor.
      </p>
    );
  }

  return (
    <>
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/vendas?corretorId=${encodeURIComponent(row.corretorId)}&estadoAberto=1`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Ver pedidos
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setDialog({
                          tipo: "CORRETOR",
                          partyLabel: row.name,
                          corretorId: row.corretorId,
                        })
                      }
                    >
                      Receber
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.tipo === "CORRETOR" ? (
        <ContasReceberReceberLoteDialog
          key={dialog.corretorId}
          open
          onOpenChange={onDialogOpenChange}
          storeId={storeId}
          partyLabel={dialog.partyLabel}
          tipo="CORRETOR"
          corretorId={dialog.corretorId}
        />
      ) : null}
    </>
  );
}
