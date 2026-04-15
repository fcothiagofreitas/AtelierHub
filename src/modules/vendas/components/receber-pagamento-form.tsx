"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  registrarMultiPagamento,
  type LinhaRecebimento,
} from "@/modules/vendas/pagamento-actions";
import {
  formasPagamentoLabels,
  formasPagamentoOrdem,
} from "@/modules/vendas/lib/labels";
import type { FormaPagamento } from "@prisma/client";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseBRL(s: string): number {
  const clean = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function formatSaldoInput(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type ReceberPagamentoFormRef = {
  submit: () => void;
};

type Props = {
  storeId: string;
  pedidoId: string;
  totalPedido: number;
  totalJaPago: number;
  /** Bloqueia inputs (ex.: outra acção no pai). */
  disabled?: boolean;
  /** Reset dos campos quando muda (ex.: modal abre). */
  resetKey?: number | string;
  onSuccess?: () => void;
  /** Para desactivar o botão «Confirmar» no pai. */
  onCanSubmitChange?: (can: boolean) => void;
  onSubmittingChange?: (busy: boolean) => void;
  /** Se true, não renderiza o bloco (pai trata visibilidade). */
  hidden?: boolean;
  /** Inclui botões Cancelar / Confirmar (modal). */
  showFooterButtons?: boolean;
  onCancel?: () => void;
  className?: string;
};

export const ReceberPagamentoForm = React.forwardRef<
  ReceberPagamentoFormRef,
  Props
>(function ReceberPagamentoForm(
  {
    storeId,
    pedidoId,
    totalPedido,
    totalJaPago,
    disabled = false,
    resetKey,
    onSuccess,
    onCanSubmitChange,
    onSubmittingChange,
    hidden = false,
    showFooterButtons = false,
    onCancel,
    className,
  },
  ref,
) {
  /** `useTransition` não cobre `await` — causava spinner infinito no «Confirmar». */
  const [submitting, setSubmitting] = React.useState(false);
  const saldo = totalPedido - totalJaPago;

  const initialValues = React.useMemo(() => {
    const base = Object.fromEntries(
      formasPagamentoOrdem.map((f) => [f, ""]),
    ) as Record<FormaPagamento, string>;
    const emAberto = Math.max(0, saldo);
    if (emAberto > 0.004) {
      base.DINHEIRO = formatSaldoInput(emAberto);
    }
    return base;
  }, [saldo]);
  const [values, setValues] =
    React.useState<Record<FormaPagamento, string>>(initialValues);

  React.useEffect(() => {
    setValues(initialValues);
  }, [resetKey, initialValues]);

  const totalEntriesSemDinheiro = formasPagamentoOrdem
    .filter((f) => f !== "DINHEIRO")
    .reduce((acc, f) => acc + parseBRL(values[f] ?? ""), 0);

  const dinheiro = parseBRL(values.DINHEIRO ?? "");
  const dinheiroNecessario = Math.max(0, saldo - totalEntriesSemDinheiro);
  const troco = Math.max(0, dinheiro - dinheiroNecessario);
  const dinheiroARegistar = Math.min(dinheiro, dinheiroNecessario);

  const totalRecebendo = totalEntriesSemDinheiro + dinheiroARegistar;
  const saldoRestante = saldo - totalRecebendo;
  const temAlgumValor = totalRecebendo > 0.004;
  const temTroco = troco > 0.004;

  React.useEffect(() => {
    onCanSubmitChange?.(temAlgumValor);
  }, [temAlgumValor, onCanSubmitChange]);

  React.useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  const handleSetValue = (forma: FormaPagamento, v: string) => {
    setValues((prev) => ({ ...prev, [forma]: v }));
  };

  const runSubmitAsync = React.useCallback(async () => {
    const totSemDin = formasPagamentoOrdem
      .filter((f) => f !== "DINHEIRO")
      .reduce((acc, f) => acc + parseBRL(values[f] ?? ""), 0);
    const din = parseBRL(values.DINHEIRO ?? "");
    const dinNec = Math.max(0, saldo - totSemDin);
    const dinReg = Math.min(din, dinNec);
    const totRec = totSemDin + dinReg;
    if (totRec <= 0.004) {
      toast.error("Informe pelo menos um valor para receber.");
      return;
    }
    setSubmitting(true);
    try {
      const linhas: LinhaRecebimento[] = formasPagamentoOrdem
        .map((forma) => {
          const valorDigitado = values[forma] ?? "";
          const valorRegistar =
            forma === "DINHEIRO"
              ? dinReg.toFixed(2)
              : parseBRL(valorDigitado).toFixed(2);
          return { forma, valorDigitado, valorRegistar };
        })
        .filter((l) => parseBRL(l.valorRegistar) > 0);

      const r = await registrarMultiPagamento({ storeId, pedidoId, linhas });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      if (r.pedidoQuitado) {
        toast.success("Pagamento registado com sucesso.");
      }
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  }, [values, saldo, storeId, pedidoId, onSuccess]);

  const runSubmit = () => {
    void runSubmitAsync();
  };

  React.useImperativeHandle(
    ref,
    () => ({ submit: runSubmit }),
    [runSubmit],
  );

  if (hidden) {
    return null;
  }

  const inputLocked = disabled || submitting;

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      <div className="grid min-h-0 grid-cols-1 divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <p className="shrink-0 px-4 pt-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:px-5">
            Forma de pagamento
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium sm:px-5">Meio</th>
                <th className="px-4 py-2 text-right font-medium sm:px-5">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {formasPagamentoOrdem.map((forma) => (
                <tr key={forma}>
                  <td className="px-4 py-2.5 text-sm sm:px-5">
                    {formasPagamentoLabels[forma]}
                  </td>
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="shrink-0 text-muted-foreground">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={values[forma]}
                        onChange={(e) => handleSetValue(forma, e.target.value)}
                        placeholder="0,00"
                        disabled={inputLocked}
                        className={cn(
                          "w-28 rounded-md border bg-muted/40 px-3 py-1.5 text-right text-sm outline-none",
                          "transition-[box-shadow,border-color] placeholder:text-muted-foreground/50",
                          "focus:border-ring focus:ring-2 focus:ring-ring/30",
                          inputLocked && "cursor-not-allowed opacity-50",
                        )}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto bg-muted/25">
          <p className="shrink-0 px-4 pt-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:px-5">
            Resumo da compra
          </p>
          <div className="space-y-1.5 px-4 pb-4 sm:px-5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Soma dos itens</span>
              <span className="tabular-nums">{fmt(totalPedido)}</span>
            </div>
            {totalJaPago > 0 ? (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Já pago</span>
                <span className="tabular-nums">− {fmt(totalJaPago)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-b border-border/60 pb-1.5 text-sm text-muted-foreground">
              <span>Em aberto (antes deste recebimento)</span>
              <span className="tabular-nums font-medium text-foreground">
                {fmt(Math.max(0, saldo))}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>A receber agora</span>
              <span className="tabular-nums text-foreground">
                {fmt(totalRecebendo)}
              </span>
            </div>
            {temTroco ? (
              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                <span>Troco a devolver</span>
                <span className="tabular-nums font-medium">{fmt(troco)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm font-semibold text-amber-600 dark:text-amber-400">
              <span>Saldo restante após confirmar</span>
              <span className="tabular-nums">{fmt(Math.max(0, saldoRestante))}</span>
            </div>
          </div>
        </div>
      </div>

      {showFooterButtons ? (
        <div className="flex shrink-0 items-center gap-2 border-t bg-muted/30 px-4 py-4 sm:px-5">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={runSubmit}
            disabled={submitting || !temAlgumValor}
            className="flex-1"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirmar recebimento
          </Button>
        </div>
      ) : null}
    </div>
  );
});
