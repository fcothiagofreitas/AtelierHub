"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formasPagamentoLabels } from "@/modules/vendas/lib/labels";
import type { FormaPagamento } from "@prisma/client";
import { ReceberModal } from "@/modules/vendas/components/receber-modal";

type Line = {
  key: string;
  label: string;
  quantidade: number;
  precoUnitario: string;
};

function moneyFromInput(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

type Props = {
  storeId: string;
  pedidoId: string;
  lines: Line[];
  totalPedido: number;
  totalJaPago: number;
  pagamentosLinhas: Array<{
    id: string;
    forma: FormaPagamento;
    valor: number;
  }>;
  actionBusy: boolean;
  onCancel: () => void;
  /** Quando false, a entrega já foi feita no carrinho — não mostrar o botão. */
  showEntregar?: boolean;
  onEntregar: () => void;
  onPagamentoRegistado: () => void;
};

export function PdvVendaFinalizadaPanel({
  storeId,
  pedidoId,
  lines,
  totalPedido,
  totalJaPago,
  pagamentosLinhas,
  actionBusy,
  onCancel,
  showEntregar = true,
  onEntregar,
  onPagamentoRegistado,
}: Props) {
  const [receberOpen, setReceberOpen] = React.useState(false);
  const moneyFmt = React.useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [],
  );

  const saldoAberto = Math.max(0, totalPedido - totalJaPago);

  return (
    <>
      <div className="shrink-0 border-b px-4 py-3 sm:px-5">
        <DialogHeader className="text-left">
          <DialogTitle>Venda finalizada</DialogTitle>
          <DialogDescription>
            Stock actualizado. Confirme o recebimento
            {showEntregar ? " ou registe entrega" : ""}; pode cancelar para fechar
            e cobrar depois.
          </DialogDescription>
        </DialogHeader>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="rounded-lg border bg-card p-3 sm:p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Itens do pedido
            </p>
            {lines.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Sem linhas.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {lines.map((L) => {
                  const sub = moneyFromInput(L.precoUnitario) * L.quantidade;
                  return (
                    <li
                      key={L.key}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="min-w-0 font-medium">{L.label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {L.quantidade} × {moneyFmt.format(moneyFromInput(L.precoUnitario))}{" "}
                        = {moneyFmt.format(sub)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total da venda</span>
                <span className="text-base font-semibold tabular-nums">
                  {moneyFmt.format(totalPedido)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-medium text-amber-600">Saldo em aberto</span>
                <span className="font-semibold tabular-nums text-amber-600">
                  {moneyFmt.format(saldoAberto)}
                </span>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 sm:p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Pagamentos registados
              </p>
              {pagamentosLinhas.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Ainda sem pagamentos.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {pagamentosLinhas.map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between gap-2 tabular-nums"
                    >
                      <span>{formasPagamentoLabels[p.forma]}</span>
                      <span>{moneyFmt.format(p.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
      <DialogFooter className="mx-0 mb-0 shrink-0 flex-col gap-3 border-t bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full touch-manipulation sm:w-auto"
            disabled={actionBusy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <div className="flex w-full flex-wrap items-stretch justify-end gap-2 sm:w-auto sm:items-center">
            {showEntregar ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-10 touch-manipulation"
                disabled={actionBusy}
                onClick={onEntregar}
              >
                Entregar
              </Button>
            ) : null}
            <Button
              type="button"
              className="min-h-10 touch-manipulation"
              disabled={
                actionBusy ||
                saldoAberto <= 0.004 ||
                !pedidoId
              }
              title={
                saldoAberto <= 0.004
                  ? "Sem saldo em aberto para receber."
                  : undefined
              }
              onClick={() => setReceberOpen(true)}
            >
              Confirmar recebimento
            </Button>
          </div>
        </div>
      </DialogFooter>
      <ReceberModal
        open={receberOpen}
        onClose={() => setReceberOpen(false)}
        storeId={storeId}
        pedidoId={pedidoId}
        totalPedido={totalPedido}
        totalJaPago={totalJaPago}
        onConfirm={() => {
          setReceberOpen(false);
          onPagamentoRegistado();
        }}
      />
    </>
  );
}
