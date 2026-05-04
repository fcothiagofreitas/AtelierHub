"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateBr } from "@/lib/format-date-br";
import { cn } from "@/lib/utils";
import {
  formasPagamentoLabels,
  formasPagamentoOrdem,
} from "@/modules/vendas/lib/labels";
import type { FormaPagamento } from "@prisma/client";
import type { PagamentoAbertoGrupoLinha } from "@/modules/vendas/cobranca-queries";

const moneyFmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type HistoricoLinhaComPedido = PagamentoAbertoGrupoLinha & {
  pedidoNumero: number;
};

type Props = {
  voltarHref: string;
  values: Record<FormaPagamento, string>;
  onValueChange: (forma: FormaPagamento, v: string) => void;
  saldoSelecionado: number;
  totalRecebendo: number;
  saldoRestante: number;
  temTroco: boolean;
  troco: number;
  temAlgumValor: boolean;
  submitBusy: boolean;
  selectedCount: number;
  onSubmit: () => void;
  historicoLinhas: HistoricoLinhaComPedido[];
  totalJaPagoSelecionado: number;
};

export function RecebimentoLotePainel({
  voltarHref,
  values,
  onValueChange,
  saldoSelecionado,
  totalRecebendo,
  saldoRestante,
  temTroco,
  troco,
  temAlgumValor,
  submitBusy,
  selectedCount,
  onSubmit,
  historicoLinhas,
  totalJaPagoSelecionado,
}: Props) {
  const porForma = formasPagamentoOrdem.map((forma) => ({
    forma,
    total: historicoLinhas
      .filter((l) => l.forma === forma)
      .reduce((a, l) => a + l.valor, 0),
  }));

  const temHistorico = historicoLinhas.length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Recebimento</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Formas de pagamento deste lançamento. Abaixo, resumo e histórico dos
          pedidos selecionados.
        </p>
      </div>

      <div className="max-h-[min(40vh,320px)] overflow-y-auto border-b">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">
                Forma de pagamento
              </th>
              <th className="px-4 py-2.5 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {formasPagamentoOrdem.map((forma) => (
              <tr key={forma}>
                <td className="px-4 py-2.5">{formasPagamentoLabels[forma]}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="shrink-0 text-muted-foreground">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={values[forma]}
                      onChange={(e) => onValueChange(forma, e.target.value)}
                      placeholder="0,00"
                      disabled={submitBusy}
                      className={cn(
                        "w-28 rounded-md border bg-muted/40 px-3 py-1.5 text-right text-sm outline-none",
                        "focus:border-ring focus:ring-2 focus:ring-ring/30",
                        submitBusy && "cursor-not-allowed opacity-50",
                      )}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {temTroco ? (
        <div className="mx-4 my-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Troco a devolver: {moneyFmt(troco)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            O cliente entregou mais dinheiro do que o saldo selecionado.
          </p>
        </div>
      ) : null}

      <div className="space-y-3 border-b bg-muted/20 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resumo do recebimento
        </p>
        {selectedCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            Selecione pedidos à esquerda para ver o histórico de pagamentos.
          </p>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Já pago (selecionados)</span>
              <span className="tabular-nums font-medium">
                {moneyFmt(totalJaPagoSelecionado)}
              </span>
            </div>
            {temHistorico ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Pagamentos já registados (por forma)
                </p>
                <ul className="space-y-1 text-sm">
                  {porForma
                    .filter((x) => x.total > 0.004)
                    .map((x) => (
                      <li
                        key={x.forma}
                        className="flex justify-between tabular-nums"
                      >
                        <span className="text-muted-foreground">
                          {formasPagamentoLabels[x.forma]}
                        </span>
                        <span>{moneyFmt(x.total)}</span>
                      </li>
                    ))}
                </ul>
                <div className="max-h-36 overflow-y-auto rounded-md border bg-background">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">
                          Pedido
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium">
                          Data
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium">
                          Forma
                        </th>
                        <th className="px-2 py-1.5 text-right font-medium">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {historicoLinhas.map((l) => (
                        <tr key={l.id}>
                          <td className="px-2 py-1.5 font-mono tabular-nums">
                            nº {l.pedidoNumero}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                            {formatDateBr(l.createdAt)}
                          </td>
                          <td className="px-2 py-1.5">
                            {formasPagamentoLabels[l.forma]}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {moneyFmt(l.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ainda não há pagamentos registados nestes pedidos.
              </p>
            )}
            <div className="space-y-1.5 border-t pt-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Saldo em aberto (selecionado)</span>
                <span className="tabular-nums font-medium text-foreground">
                  {moneyFmt(Math.max(0, saldoSelecionado))}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>A receber agora</span>
                <span className="tabular-nums text-foreground">
                  {moneyFmt(totalRecebendo)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-amber-600 dark:text-amber-400">
                <span>Saldo restante após confirmar</span>
                <span className="tabular-nums">
                  {moneyFmt(Math.max(0, saldoRestante))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 sm:flex-row">
        <Link
          href={voltarHref}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "sm:flex-1",
            submitBusy && "pointer-events-none opacity-50",
          )}
        >
          Voltar
        </Link>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitBusy || !temAlgumValor || selectedCount === 0}
          className="inline-flex flex-1 items-center justify-center gap-2 sm:flex-1"
        >
          {submitBusy ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : null}
          {submitBusy
            ? "A registar…"
            : temTroco
              ? `Aceitar e dar troco ${moneyFmt(troco)}`
              : "Confirmar recebimento"}
        </Button>
      </div>
    </div>
  );
}
