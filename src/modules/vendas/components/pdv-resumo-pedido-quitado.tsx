"use client";

import type { ReactNode } from "react";
import type { PedidoVerPayload } from "@/modules/vendas/vendas-ver-actions";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { pedidoModalidadeLabels, formasPagamentoLabels } from "@/modules/vendas/lib/labels";
import { PedidoEstadoBadge } from "@/modules/vendas/components/pedido-estado-badge";
import { Badge } from "@/components/ui/badge";
import { formatDateBr } from "@/lib/format-date-br";
import { cn } from "@/lib/utils";

type Props = {
  storeName: string;
  pedido: PedidoVerPayload;
  moneyFmt: Intl.NumberFormat;
};

function MetaLinha({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 sm:col-span-1", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

/**
 * Resumo completo para pedido quitado (painel `pagamento=1` só leitura).
 * Esquerda: itens + pagamentos + totais. Direita: metadados da compra (loja, pessoas, entrega).
 */
export function PdvResumoPedidoQuitado({ storeName, pedido, moneyFmt }: Props) {
  const clienteLabel = pedido.cliente
    ? clienteNomeCurto(pedido.cliente)
    : "A definir";

  const pagamentosOrdenados = [...pedido.pagamentos].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const colunaItensPagamentos = (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="rounded-lg border bg-card p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Itens
        </p>
        <div className="mt-2 overflow-x-auto overflow-y-hidden rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/50 text-left text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Variação</th>
                <th className="px-3 py-2 font-medium">Ref.</th>
                <th className="px-3 py-2 font-medium">EAN</th>
                <th className="px-3 py-2 text-right font-medium">Qtd</th>
                <th className="px-3 py-2 text-right font-medium">Unit.</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedido.itens.map((it) => {
                const sub = it.quantidade * it.precoUnitario;
                return (
                  <tr key={it.id} className="bg-card">
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        {it.produtoVariacao.produto.nome}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {it.produtoVariacao.nome}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {it.produtoVariacao.produto.referencia ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {it.produtoVariacao.ean13 ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {it.quantidade}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {moneyFmt.format(it.precoUnitario)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {moneyFmt.format(sub)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Dados da compra (pagamentos)
        </p>
        {pagamentosOrdenados.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm">
            {pagamentosOrdenados.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-border/60 bg-muted/20 px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-muted-foreground">
                    {formatDateBr(p.createdAt)}
                    {" · "}
                    <span className="font-medium text-foreground">
                      {formasPagamentoLabels[p.forma]}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-foreground">
                    {moneyFmt.format(p.valor)}
                  </span>
                </div>
                {p.obs?.trim() ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Obs.: {p.obs}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum pagamento registado.
          </p>
        )}
      </section>

      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
        <div className="flex justify-between gap-2 tabular-nums">
          <span className="text-muted-foreground">Total do pedido</span>
          <span className="font-semibold">
            {pedido.total != null
              ? moneyFmt.format(pedido.total)
              : "—"}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-2 tabular-nums text-green-700 dark:text-green-400">
          <span className="font-medium">Total pago</span>
          <span className="font-semibold">
            {moneyFmt.format(
              pedido.pagamentos.reduce((a, x) => a + x.valor, 0),
            )}
          </span>
        </div>
      </div>
    </div>
  );

  const colunaInformacoes = (
    <div className="flex min-w-0 flex-col gap-5">
      <section
        className="rounded-lg border bg-card p-4"
        aria-labelledby="resumo-pedido-info"
      >
        <h3
          id="resumo-pedido-info"
          className="text-sm font-semibold text-foreground"
        >
          Informações da compra
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <MetaLinha label="Nº do pedido">
            <span className="font-mono tabular-nums">{pedido.numero}</span>
          </MetaLinha>
          <MetaLinha label="Loja">{storeName}</MetaLinha>
          <MetaLinha label="Criado em" className="sm:col-span-2">
            {formatDateBr(pedido.createdAt)}
          </MetaLinha>
          <MetaLinha label="Estado">
            <PedidoEstadoBadge estado={pedido.estado} />
          </MetaLinha>
          <MetaLinha label="Modalidade">
            <Badge variant="outline" className="font-normal">
              {pedidoModalidadeLabels[pedido.modalidade]}
            </Badge>
          </MetaLinha>
          <MetaLinha label="ID interno" className="sm:col-span-2">
            <span className="break-all font-mono text-xs text-muted-foreground">
              {pedido.id}
            </span>
          </MetaLinha>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pessoas
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-1">
            <MetaLinha label="Cliente">{clienteLabel}</MetaLinha>
            <MetaLinha label="Vendedor">{pedido.vendedor.name}</MetaLinha>
            <MetaLinha label="Corretor">
              {pedido.corretor?.name ?? "—"}
            </MetaLinha>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entrega
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-1">
            <MetaLinha label="Registada em">
              {pedido.entregueEm
                ? formatDateBr(pedido.entregueEm)
                : "Não registada"}
            </MetaLinha>
            <MetaLinha label="Entregue por">
              {pedido.entreguePor?.name ?? "—"}
            </MetaLinha>
          </div>
        </div>

        {pedido.dividaCorretorValor != null &&
        pedido.dividaCorretorValor > 0.004 ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <span className="font-medium">Dívida ao corretor (consignado): </span>
            {moneyFmt.format(pedido.dividaCorretorValor)}
          </div>
        ) : null}
      </section>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
      {/* Desktop: itens à esquerda, info à direita. Mobile: info primeiro, depois itens. */}
      <div className="order-2 min-w-0 space-y-1 lg:order-1">
        {colunaItensPagamentos}
      </div>
      <div className="order-1 min-w-0 space-y-1 lg:order-2">
        {colunaInformacoes}
      </div>
    </div>
  );
}
