"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Props = {
  open: boolean;
  onClose: () => void;
  storeId: string;
  pedidoId: string;
  /** Total bruto do pedido (Soma dos itens). */
  totalPedido: number;
  /** Total já pago em pagamentos anteriores. */
  totalJaPago: number;
  /** Chamado quando o pagamento for confirmado com sucesso. */
  onConfirm?: () => void;
};

export function ReceberModal({
  open,
  onClose,
  storeId,
  pedidoId,
  totalPedido,
  totalJaPago,
  onConfirm,
}: Props) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const saldo = totalPedido - totalJaPago;

  const initialValues = React.useMemo(
    () => Object.fromEntries(formasPagamentoOrdem.map((f) => [f, ""])) as Record<FormaPagamento, string>,
    [],
  );
  const [values, setValues] = React.useState<Record<FormaPagamento, string>>(initialValues);

  // Reset ao abrir
  React.useEffect(() => {
    if (open) setValues(initialValues);
  }, [open, initialValues]);

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

  const handleSetValue = (forma: FormaPagamento, v: string) => {
    setValues((prev) => ({ ...prev, [forma]: v }));
  };

  const handleConfirm = () => {
    if (!temAlgumValor) {
      toast.error("Informe pelo menos um valor para receber.");
      return;
    }
    startTransition(async () => {
      const linhas: LinhaRecebimento[] = formasPagamentoOrdem
        .map((forma) => {
          const valorDigitado = values[forma] ?? "";
          const valorRegistar =
            forma === "DINHEIRO"
              ? dinheiroARegistar.toFixed(2)
              : parseBRL(valorDigitado).toFixed(2);
          return { forma, valorDigitado, valorRegistar };
        })
        .filter((l) => parseBRL(l.valorRegistar) > 0);

      const r = await registrarMultiPagamento({ storeId, pedidoId, linhas });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Pagamento registado com sucesso.");
      router.refresh();
      onConfirm?.();
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "w-[min(520px,calc(100vw-2rem))] max-w-none",
        )}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle>Pagamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Tabela de formas de pagamento */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">Forma de pagamento</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {formasPagamentoOrdem.map((forma) => (
                <tr key={forma}>
                  <td className="px-5 py-3 text-sm">{formasPagamentoLabels[forma]}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="shrink-0 text-muted-foreground">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={values[forma]}
                        onChange={(e) => handleSetValue(forma, e.target.value)}
                        placeholder="0,00"
                        disabled={busy}
                        className={cn(
                          "w-28 rounded-md border bg-muted/40 px-3 py-1.5 text-right text-sm outline-none",
                          "transition-[box-shadow,border-color] placeholder:text-muted-foreground/50",
                          "focus:border-ring focus:ring-2 focus:ring-ring/30",
                          busy && "opacity-50 cursor-not-allowed",
                        )}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Aviso de troco */}
          {temTroco && (
            <div className="mx-5 my-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Troco a devolver: {fmt(troco)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                O cliente entregou mais dinheiro do que o saldo em aberto. Devolva o troco.
              </p>
            </div>
          )}
        </div>

        {/* Resumo fixo no rodapé */}
        <div className="shrink-0 space-y-0 border-t bg-muted/30 px-5 py-4">
          <div className="mb-3 space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Soma dos itens</span>
              <span className="tabular-nums">{fmt(totalPedido)}</span>
            </div>
            {totalJaPago > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Já pago</span>
                <span className="tabular-nums">− {fmt(totalJaPago)}</span>
              </div>
            )}
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
            <div className="flex justify-between text-sm font-semibold text-amber-600 dark:text-amber-400">
              <span>Saldo restante após confirmar</span>
              <span className="tabular-nums">{fmt(Math.max(0, saldoRestante))}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={busy}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={busy || !temAlgumValor}
              className="flex-1"
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {temTroco ? `Aceitar e dar troco ${fmt(troco)}` : "Confirmar recebimento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
