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
import { formatDateBr } from "@/lib/format-date-br";
import { cn } from "@/lib/utils";
import {
  getPedidosParaRecebimentoLote,
  receberEmLote,
} from "@/modules/vendas/cobranca-actions";
import type { LinhaRecebimento } from "@/modules/vendas/pagamento-actions";
import {
  formasPagamentoLabels,
  formasPagamentoOrdem,
} from "@/modules/vendas/lib/labels";
import type { FormaPagamento, GrupoCobrancaTipo } from "@prisma/client";
import type { PedidoAbertoGrupoRow } from "@/modules/vendas/cobranca-queries";

const moneyFmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseBRL(s: string): number {
  const clean = s.replace(/\s/g, "").replace(",", ".");
  const num = Number(clean);
  return Number.isFinite(num) ? num : 0;
}

function formatSaldoInput(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  partyLabel: string;
  tipo: GrupoCobrancaTipo;
  clienteId?: string;
  corretorId?: string;
};

export function ContasReceberReceberLoteDialog({
  open,
  onOpenChange,
  storeId,
  partyLabel,
  tipo,
  clienteId,
  corretorId,
}: Props) {
  const router = useRouter();
  const [loadBusy, setLoadBusy] = React.useState(false);
  const [rows, setRows] = React.useState<PedidoAbertoGrupoRow[] | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [submitBusy, startTransition] = React.useTransition();

  const [values, setValues] = React.useState<Record<FormaPagamento, string>>(
    () => Object.fromEntries(formasPagamentoOrdem.map((f) => [f, ""])) as Record<
      FormaPagamento,
      string
    >,
  );

  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  React.useEffect(() => {
    if (!open) return;
    setRows(null);
    setValues(
      Object.fromEntries(formasPagamentoOrdem.map((f) => [f, ""])) as Record<
        FormaPagamento,
        string
      >,
    );
    setLoadBusy(true);
    (async () => {
      const r = await getPedidosParaRecebimentoLote(storeId, {
        tipo,
        clienteId,
        corretorId,
      });
      setLoadBusy(false);
      if ("error" in r) {
        toast.error(r.error);
        onOpenChangeRef.current(false);
        return;
      }
      if (r.pedidos.length === 0) {
        toast.error("Não há pedidos em aberto para receber.");
        onOpenChangeRef.current(false);
        return;
      }
      setRows(r.pedidos);
      setSelected(new Set(r.pedidos.map((p) => p.id)));
    })();
  }, [open, storeId, tipo, clienteId, corretorId]);

  const selectedRows = React.useMemo(() => {
    if (!rows) return [];
    return rows.filter((p) => selected.has(p.id));
  }, [rows, selected]);
  const allSelected = !!rows && rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const saldoSelecionado = selectedRows.reduce((a, p) => a + p.saldo, 0);

  const initialPaymentValues = React.useMemo(() => {
    const base = Object.fromEntries(
      formasPagamentoOrdem.map((f) => [f, ""]),
    ) as Record<FormaPagamento, string>;
    if (saldoSelecionado > 0.004) {
      base.DINHEIRO = formatSaldoInput(saldoSelecionado);
    }
    return base;
  }, [saldoSelecionado]);

  React.useEffect(() => {
    if (open && rows && !loadBusy) {
      setValues(initialPaymentValues);
    }
  }, [open, rows, loadBusy, initialPaymentValues]);

  const totalEntriesSemDinheiro = formasPagamentoOrdem
    .filter((f) => f !== "DINHEIRO")
    .reduce((acc, f) => acc + parseBRL(values[f] ?? ""), 0);

  const dinheiro = parseBRL(values.DINHEIRO ?? "");
  const dinheiroNecessario = Math.max(0, saldoSelecionado - totalEntriesSemDinheiro);
  const troco = Math.max(0, dinheiro - dinheiroNecessario);
  const dinheiroARegistar = Math.min(dinheiro, dinheiroNecessario);
  const totalRecebendo = totalEntriesSemDinheiro + dinheiroARegistar;
  const saldoRestante = saldoSelecionado - totalRecebendo;
  const temAlgumValor = totalRecebendo > 0.004;
  const temTroco = troco > 0.004;

  const handleSetValue = (forma: FormaPagamento, v: string) => {
    setValues((prev) => ({ ...prev, [forma]: v }));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (!rows || rows.length === 0) return;
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((p) => p.id)));
  };

  const confirm = () => {
    if (selected.size === 0) {
      toast.error("Selecione pelo menos um pedido.");
      return;
    }
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

      const pedidoIds = selectedRows
        .slice()
        .sort((a, b) => a.numero - b.numero)
        .map((p) => p.id);
      const r = await receberEmLote({
        storeId,
        tipo,
        pedidoIds,
        linhas,
      });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Recebimento em lote registado.");
      router.refresh();
      onOpenChange(false);
    });
  };

  const showBody = !loadBusy && rows && rows.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitBusy) onOpenChange(false);
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0",
          "w-[min(980px,calc(100vw-2rem))] max-w-none",
        )}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle>
            Pagamento em lote — <span className="font-medium">{partyLabel}</span>
          </DialogTitle>
        </DialogHeader>

        {loadBusy || !rows ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            A carregar pedidos…
          </div>
        ) : !showBody ? null : (
          <div className="grid min-h-0 flex-1 md:grid-cols-[1.2fr_1fr]">
            <section className="min-h-0 border-b md:border-b-0 md:border-r">
              <div className="border-b px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Aplicação por ordem de n.º de pedido (FIFO). Ajuste o que entra
                  neste recebimento.
                </p>
              </div>
              <div className="max-h-[42vh] overflow-y-auto md:max-h-none md:h-full">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="w-8 px-5 py-2">
                        <input
                          type="checkbox"
                          className="size-4 rounded border"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={toggleAll}
                          disabled={submitBusy}
                          aria-label="Selecionar todos os pedidos"
                        />
                      </th>
                      <th className="py-2 font-medium">N.º</th>
                      <th className="py-2 font-medium">Informação</th>
                      <th className="py-2 font-medium">Data</th>
                      <th className="px-5 py-2 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((p) => (
                      <React.Fragment key={p.id}>
                        <tr className="bg-card">
                          <td className="px-5 py-2">
                            <input
                              type="checkbox"
                              className="size-4 rounded border"
                              checked={selected.has(p.id)}
                              onChange={() => toggle(p.id)}
                              disabled={submitBusy}
                            />
                          </td>
                          <td className="font-mono tabular-nums">{p.numero}</td>
                          <td className="max-w-[180px] truncate text-muted-foreground">
                            {p.clienteLabel ?? "—"}
                          </td>
                          <td className="whitespace-nowrap text-muted-foreground">
                            {formatDateBr(p.createdAt)}
                          </td>
                          <td className="px-5 text-right tabular-nums">
                            {moneyFmt(p.saldo)}
                          </td>
                        </tr>
                        {p.pagamentosAnteriores.length > 0 ? (
                          <tr className="border-t-0 bg-muted/15">
                            <td className="px-5 pb-3 pt-0" colSpan={5}>
                              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Pagamentos já registados
                              </p>
                              <ul className="space-y-0.5 text-xs text-muted-foreground">
                                {p.pagamentosAnteriores.map((ev) => (
                                  <li key={ev.id} className="tabular-nums">
                                    <span className="text-foreground">
                                      {formatDateBr(ev.createdAt)}
                                    </span>
                                    {" · "}
                                    <span>{formasPagamentoLabels[ev.forma]}</span>
                                    {" · "}
                                    <span className="font-medium text-foreground">
                                      {moneyFmt(ev.valor)}
                                    </span>
                                    {ev.obs?.trim() ? (
                                      <span className="block text-[11px] italic">
                                        Obs.: {ev.obs.trim()}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-5 py-3 text-left font-medium">
                        Forma de pagamento
                      </th>
                      <th className="px-5 py-3 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formasPagamentoOrdem.map((forma) => (
                      <tr key={forma}>
                        <td className="px-5 py-3 text-sm">
                          {formasPagamentoLabels[forma]}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="shrink-0 text-muted-foreground">R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={values[forma]}
                              onChange={(e) => handleSetValue(forma, e.target.value)}
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

                {temTroco && (
                  <div className="mx-5 my-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Troco a devolver: {moneyFmt(troco)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      O cliente entregou mais dinheiro do que o saldo selecionado.
                      Devolva o troco.
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t bg-muted/30 px-5 py-4">
                <div className="mb-3 space-y-1.5">
                  <div className="flex justify-between border-b border-border/60 pb-1.5 text-sm text-muted-foreground">
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={submitBusy}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirm}
                    disabled={submitBusy || !temAlgumValor || selected.size === 0}
                    className="flex-1"
                  >
                    {submitBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {temTroco
                      ? `Aceitar e dar troco ${moneyFmt(troco)}`
                      : "Receber"}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
