"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formasPagamentoLabels } from "@/modules/vendas/lib/labels";
import { aggregatePagamentosPorForma } from "@/modules/vendas/lib/aggregate-pagamentos-por-forma";
import type { FormaPagamento } from "@prisma/client";
import {
  ReceberPagamentoForm,
  type ReceberPagamentoFormRef,
} from "@/modules/vendas/components/receber-pagamento-form";
import { PdvResumoPedidoQuitado } from "@/modules/vendas/components/pdv-resumo-pedido-quitado";
import type { PedidoVerPayload } from "@/modules/vendas/vendas-ver-actions";
import { cn } from "@/lib/utils";

const TEM_PAGAMENTO = (
  linhas: Array<{ valor: number }>,
) => linhas.some((p) => p.valor > 0.004);

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
    createdAt?: string;
  }>;
  actionBusy: boolean;
  onCancel: () => void;
  /** Pedido quitado: só resumo (itens + pagamentos), sem formas de pagamento. */
  somenteLeitura?: boolean;
  /** Resumo completo (loja + payload); quando ausente, usa só `lines` / `pagamentosLinhas`. */
  pedidoResumoCompleto?: { storeName: string; pedido: PedidoVerPayload } | null;
  /** Rótulo do botão outline (ex.: Fechar em modo leitura). */
  cancelarLabel?: string;
  /** Quando false, a consignação já foi registada — não mostrar o botão. */
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
  somenteLeitura = false,
  pedidoResumoCompleto = null,
  cancelarLabel = "Cancelar",
  showEntregar = true,
  onEntregar,
  onPagamentoRegistado,
}: Props) {
  const pagamentoRef = React.useRef<ReceberPagamentoFormRef>(null);
  const [canSubmitPagamento, setCanSubmitPagamento] = React.useState(false);
  const [pagamentoSubmitting, setPagamentoSubmitting] = React.useState(false);

  const moneyFmt = React.useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [],
  );

  const saldoAberto = Math.max(0, totalPedido - totalJaPago);
  const temSaldoParaReceber = saldoAberto > 0.004;

  const pagamentosAgregados = React.useMemo(
    () => aggregatePagamentosPorForma(pagamentosLinhas),
    [pagamentosLinhas],
  );

  const linhasParaRecibo = pedidoResumoCompleto
    ? pedidoResumoCompleto.pedido.pagamentos
    : pagamentosLinhas;
  const mostrarRecibo = TEM_PAGAMENTO(linhasParaRecibo);

  const pagamentosOrdenados = React.useMemo(() => {
    return [...pagamentosLinhas].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
  }, [pagamentosLinhas]);

  return (
    <>
      <div className="shrink-0 border-b px-4 py-3 sm:px-5">
        <DialogHeader className="text-left">
          <DialogTitle>
            {somenteLeitura && pedidoResumoCompleto
              ? `Pedido nº ${pedidoResumoCompleto.pedido.numero} · Quitado`
              : somenteLeitura
                ? "Pedido quitado"
                : "Venda finalizada"}
          </DialogTitle>
          <DialogDescription>
            {somenteLeitura && pedidoResumoCompleto ? (
              <>
                {pedidoResumoCompleto.storeName} ·{" "}
                {new Date(pedidoResumoCompleto.pedido.createdAt).toLocaleString(
                  "pt-BR",
                  { dateStyle: "medium", timeStyle: "short" },
                )}
                . Resumo completo abaixo — use Fechar para voltar à lista.
              </>
            ) : somenteLeitura ? (
              <>
                Resumo da compra e dos pagamentos registados. Use Fechar para voltar à
                lista.
              </>
            ) : (
              <>
                Stock actualizado. Confirme o pagamento
                {showEntregar ? " ou registe a consignação" : ""}; pode cancelar para fechar
                e cobrar depois.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {somenteLeitura && pedidoResumoCompleto ? (
          <PdvResumoPedidoQuitado
            storeName={pedidoResumoCompleto.storeName}
            pedido={pedidoResumoCompleto.pedido}
            moneyFmt={moneyFmt}
          />
        ) : (
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

            <div className="flex min-w-0 flex-col gap-3">
              {somenteLeitura ? (
                <div className="rounded-lg border bg-card p-3 sm:p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Como foi pago
                  </p>
                  {pagamentosOrdenados.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm">
                      {pagamentosOrdenados.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="text-muted-foreground">
                            {p.createdAt
                              ? new Date(p.createdAt).toLocaleString("pt-BR", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "—"}
                            {" · "}
                            <span className="text-foreground">
                              {formasPagamentoLabels[p.forma]}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums font-medium">
                            {moneyFmt.format(p.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhum pagamento registado.
                    </p>
                  )}
                </div>
              ) : null}

              {!somenteLeitura && pagamentosAgregados.length > 0 ? (
                <div className="rounded-lg border bg-card p-3 sm:p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Pagamentos já registados
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {pagamentosAgregados.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between gap-2 tabular-nums"
                      >
                        <span>{formasPagamentoLabels[p.forma]}</span>
                        <span>{moneyFmt.format(p.valor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {somenteLeitura ? (
                <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2 tabular-nums">
                    <span className="text-muted-foreground">Total do pedido</span>
                    <span className="font-semibold">{moneyFmt.format(totalPedido)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 tabular-nums text-green-700 dark:text-green-400">
                    <span className="font-medium">Total pago</span>
                    <span className="font-semibold">{moneyFmt.format(totalJaPago)}</span>
                  </div>
                </div>
              ) : temSaldoParaReceber ? (
                <div
                  className={cn(
                    "overflow-hidden rounded-lg border bg-card",
                    "min-h-0 lg:min-h-[280px]",
                  )}
                >
                  <ReceberPagamentoForm
                    ref={pagamentoRef}
                    storeId={storeId}
                    pedidoId={pedidoId}
                    totalPedido={totalPedido}
                    totalJaPago={totalJaPago}
                    disabled={actionBusy}
                    resetKey={`${pedidoId}-${totalJaPago}`}
                    onCanSubmitChange={setCanSubmitPagamento}
                    onSubmittingChange={setPagamentoSubmitting}
                    onSuccess={onPagamentoRegistado}
                  />
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Sem saldo em aberto</p>
                  <p className="mt-1">Não é necessário registar pagamento neste pedido.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <DialogFooter className="mx-0 mb-0 shrink-0 flex-col gap-3 border-t bg-muted/30 px-4 py-4 sm:px-6">
        {mostrarRecibo ? (
          <div className="flex w-full justify-start">
            <Link
              href={`/api/vendas/pedido/${pedidoId}/recibo`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="vendas-recibo-pdf-finalizada"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "no-underline",
              )}
            >
              Baixar recibo (PDF)
            </Link>
          </div>
        ) : null}
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full touch-manipulation sm:w-auto"
            disabled={actionBusy}
            onClick={onCancel}
          >
            {cancelarLabel}
          </Button>
          {!somenteLeitura ? (
            <div className="flex w-full flex-wrap items-stretch justify-end gap-2 sm:w-auto sm:items-center">
              {showEntregar ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 touch-manipulation"
                  disabled={actionBusy}
                  onClick={onEntregar}
                >
                  Consignar
                </Button>
              ) : null}
              <Button
                type="button"
                className="min-h-10 touch-manipulation"
                disabled={
                  actionBusy ||
                  !temSaldoParaReceber ||
                  !pedidoId ||
                  !canSubmitPagamento ||
                  pagamentoSubmitting
                }
                title={
                  !temSaldoParaReceber
                    ? "Sem saldo em aberto para pagar."
                    : !canSubmitPagamento
                      ? "Informe o valor nas formas de pagamento."
                      : undefined
                }
                onClick={() => pagamentoRef.current?.submit()}
              >
                {pagamentoSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Confirmar pagamento
              </Button>
            </div>
          ) : null}
        </div>
      </DialogFooter>
    </>
  );
}
