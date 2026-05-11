"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseBRL } from "@/lib/form-utils";
import { formatDateBr } from "@/lib/format-date-br";
import { receberEmLote } from "@/modules/vendas/cobranca-actions";
import type { LinhaRecebimento } from "@/modules/vendas/pagamento-actions";
import { formasPagamentoOrdem } from "@/modules/vendas/lib/labels";
import type { FormaPagamento, GrupoCobrancaTipo } from "@prisma/client";
import type { PedidoAbertoGrupoRow } from "@/modules/vendas/cobranca-queries";
import {
  RecebimentoLotePainel,
  type HistoricoLinhaComPedido,
} from "@/modules/vendas/components/recebimento-lote-painel";

const moneyFmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatSaldoInput(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  storeId: string;
  tipo: GrupoCobrancaTipo;
  partyLabel: string;
  pedidos: PedidoAbertoGrupoRow[];
  voltarHref: string;
};

export function ContasReceberRecebimentoClient({
  storeId,
  tipo,
  partyLabel,
  pedidos: initialPedidos,
  voltarHref,
}: Props) {
  const router = useRouter();
  const [submitBusy, startTransition] = React.useTransition();

  const [selected, setSelected] = React.useState<Set<string>>(() => {
    return new Set(initialPedidos.map((p) => p.id));
  });

  const [values, setValues] = React.useState<Record<FormaPagamento, string>>(
    () =>
      Object.fromEntries(formasPagamentoOrdem.map((f) => [f, ""])) as Record<
        FormaPagamento,
        string
      >,
  );

  React.useEffect(() => {
    setSelected(new Set(initialPedidos.map((p) => p.id)));
  }, [initialPedidos]);

  const rows = initialPedidos;
  const selectedRows = React.useMemo(() => {
    if (rows.length === 0) return [];
    return rows.filter((p) => selected.has(p.id));
  }, [rows, selected]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const saldoSelecionado = selectedRows.reduce((a, p) => a + p.saldo, 0);
  const totalPedidosSelecionado = selectedRows.reduce((a, p) => a + p.total, 0);
  const totalJaPagoSelecionado = selectedRows.reduce((a, p) => a + p.jaPago, 0);

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
    setValues(initialPaymentValues);
  }, [initialPaymentValues]);

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

  const historicoLinhas = React.useMemo((): HistoricoLinhaComPedido[] => {
    const out: HistoricoLinhaComPedido[] = [];
    for (const p of selectedRows) {
      for (const pay of p.pagamentos) {
        out.push({ ...pay, pedidoNumero: p.numero });
      }
    }
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  }, [selectedRows]);

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
    if (rows.length === 0) return;
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
      router.push(voltarHref);
      router.refresh();
    });
  };

  const tituloContexto =
    tipo === "CLIENTE" ? "Cliente" : "Corretor";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link
              href={voltarHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Contas a receber
            </Link>
            <span aria-hidden> · </span>
            Recebimento
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {partyLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tituloContexto} · aplicação por n.º de pedido (FIFO)
          </p>
        </div>
        <Link
          href={voltarHref}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Voltar à lista
        </Link>
      </div>

      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
        dir="ltr"
      >
        <section
          aria-label="Pedidos em aberto"
          className="min-w-0 space-y-4 lg:col-span-8"
        >
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="border-b bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium">Pedidos com saldo em aberto</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Selecione os pedidos que entram neste recebimento. O valor
                aplica-se por ordem de n.º (FIFO).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3">
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
                    <th className="py-3 font-medium">N.º</th>
                    <th className="py-3 font-medium">Cliente</th>
                    <th className="py-3 font-medium">Data</th>
                    <th className="py-3 text-right font-medium">Total</th>
                    <th className="py-3 text-right font-medium">Já pago</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((p) => (
                    <tr key={p.id} className="bg-card">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          className="size-4 rounded border"
                          checked={selected.has(p.id)}
                          onChange={() => toggle(p.id)}
                          disabled={submitBusy}
                        />
                      </td>
                      <td className="font-mono tabular-nums">{p.numero}</td>
                      <td className="max-w-[200px] truncate text-muted-foreground">
                        {p.clienteLabel ?? "—"}
                      </td>
                      <td className="whitespace-nowrap text-muted-foreground">
                        {formatDateBr(p.createdAt)}
                      </td>
                      <td className="text-right tabular-nums">{moneyFmt(p.total)}</td>
                      <td className="text-right tabular-nums text-muted-foreground">
                        {moneyFmt(p.jaPago)}
                      </td>
                      <td className="px-4 text-right tabular-nums font-medium">
                        {moneyFmt(p.saldo)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/vendas?pdv=1&view=${encodeURIComponent(p.id)}&pagamento=1`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "text-primary",
                          )}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resumo da seleção
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:block sm:space-y-1">
                <dt className="text-muted-foreground">Pedidos selecionados</dt>
                <dd className="font-medium tabular-nums text-right sm:text-left">
                  {selectedRows.length} / {rows.length}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:block sm:space-y-1">
                <dt className="text-muted-foreground">Total (fatura)</dt>
                <dd className="font-medium tabular-nums text-right sm:text-left">
                  {moneyFmt(totalPedidosSelecionado)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:block sm:space-y-1">
                <dt className="text-muted-foreground">Já pago</dt>
                <dd className="font-medium tabular-nums text-right sm:text-left">
                  {moneyFmt(totalJaPagoSelecionado)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:block sm:space-y-1">
                <dt className="text-muted-foreground">Saldo a receber</dt>
                <dd className="font-semibold tabular-nums text-right sm:text-left">
                  {moneyFmt(saldoSelecionado)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <aside
          aria-label="Formulário de recebimento"
          className="min-w-0 lg:sticky lg:top-4 lg:col-span-4 lg:self-start"
        >
          <RecebimentoLotePainel
            voltarHref={voltarHref}
            values={values}
            onValueChange={handleSetValue}
            saldoSelecionado={saldoSelecionado}
            totalRecebendo={totalRecebendo}
            saldoRestante={saldoRestante}
            temTroco={temTroco}
            troco={troco}
            temAlgumValor={temAlgumValor}
            submitBusy={submitBusy}
            selectedCount={selected.size}
            onSubmit={confirm}
            historicoLinhas={historicoLinhas}
            totalJaPagoSelecionado={totalJaPagoSelecionado}
          />
        </aside>
      </div>
    </div>
  );
}
