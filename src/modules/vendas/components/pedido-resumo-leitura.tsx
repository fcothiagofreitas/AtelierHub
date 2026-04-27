import Link from "next/link";
import { formasPagamentoLabels } from "@/modules/vendas/lib/labels";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import type { PedidoVerPayload } from "@/modules/vendas/vendas-ver-actions";
import { buttonVariants } from "@/components/ui/button";
import { formatDateBr } from "@/lib/format-date-br";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function lineTotal(q: number, preco: number) {
  return q * preco;
}

export function PedidoResumoLeitura({
  storeName,
  pedido,
}: {
  storeName: string;
  pedido: PedidoVerPayload;
}) {
  const totalItens = pedido.itens.reduce(
    (acc, it) => acc + lineTotal(it.quantidade, it.precoUnitario),
    0,
  );
  const totalPago = pedido.pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const saldoEmAberto =
    pedido.total != null ? Math.max(0, pedido.total - totalPago) : 0;
  const podePagar =
    (pedido.estado === "EM_ABERTO" || pedido.estado === "PAGO_PARCIAL") &&
    saldoEmAberto > 0.004;

  const podeBaixarPdfPedido =
    pedido.estado !== "EM_ANDAMENTO" &&
    pedido.estado !== "CANCELADO" &&
    pedido.total != null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cliente
          </p>
          <p className="mt-1 font-medium">
            {pedido.cliente ? clienteNomeCurto(pedido.cliente) : "A definir"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Loja
          </p>
          <p className="mt-1 font-medium">{storeName}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vendedor
          </p>
          <p className="mt-1 font-medium">{pedido.vendedor.name}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Corretor
          </p>
          <p className="mt-1 font-medium">{pedido.corretor?.name ?? "—"}</p>
        </div>
      </div>

      {pedido.entregueEm ? (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entrega ao cliente
          </p>
          <p className="mt-1 text-foreground">
            {formatDateBr(pedido.entregueEm)}
            {pedido.entreguePor ? (
              <span className="text-muted-foreground">
                {" "}
                — {pedido.entreguePor.name}
              </span>
            ) : null}
          </p>
          {pedido.dividaCorretorValor != null &&
          pedido.dividaCorretorValor > 0.004 ? (
            <p className="mt-2 font-medium text-amber-700 dark:text-amber-400">
              Dívida do corretor (registada na entrega):{" "}
              {money.format(pedido.dividaCorretorValor)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-medium">Itens</h2>
        <div className="mt-2 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Variação</th>
                <th className="px-3 py-2 text-right font-medium">Qtd</th>
                <th className="px-3 py-2 text-right font-medium">Preço unit.</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedido.itens.map((it) => {
                const sub = lineTotal(it.quantidade, it.precoUnitario);
                return (
                  <tr key={it.id} className="bg-card">
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        {it.produtoVariacao.produto.nome}
                      </span>
                      {it.produtoVariacao.produto.referencia && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({it.produtoVariacao.produto.referencia})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {it.produtoVariacao.nome}
                      {it.produtoVariacao.ean13 && (
                        <span className="ml-2 font-mono text-xs">
                          · {it.produtoVariacao.ean13}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.quantidade}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {money.format(it.precoUnitario)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {money.format(sub)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <div className="flex w-full max-w-sm justify-between">
          <span className="text-muted-foreground">Soma dos itens</span>
          <span className="tabular-nums font-medium">{money.format(totalItens)}</span>
        </div>
        <div className="flex w-full max-w-sm justify-between text-base">
          <span className="font-medium">Total do pedido</span>
          <span className="tabular-nums font-semibold">
            {pedido.total != null ? money.format(pedido.total) : "—"}
          </span>
        </div>
        {pedido.pagamentos.length > 0 && (
          <div className="flex w-full max-w-sm justify-between text-green-700 dark:text-green-400">
            <span className="font-medium">Total pago</span>
            <span className="tabular-nums font-semibold">{money.format(totalPago)}</span>
          </div>
        )}
        {podePagar && (
          <div className="flex w-full max-w-sm justify-between text-amber-700 dark:text-amber-400">
            <span className="font-medium">Saldo em aberto</span>
            <span className="tabular-nums font-semibold">{money.format(saldoEmAberto)}</span>
          </div>
        )}
      </div>

      {pedido.pagamentos.length > 0 && (
        <div>
          <h2 className="text-sm font-medium">Pagamentos recebidos</h2>
          <div className="mt-2 overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Forma</th>
                  <th className="px-3 py-2 font-medium">Observação</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pedido.pagamentos.map((p) => (
                  <tr key={p.id} className="bg-card">
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDateBr(p.createdAt)}
                    </td>
                    <td className="px-3 py-2">{formasPagamentoLabels[p.forma]}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.obs ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-green-700 dark:text-green-400">
                      {money.format(p.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {podeBaixarPdfPedido ? (
        <p className="mt-3">
          <Link
            href={`/api/vendas/pedido/${pedido.id}/recibo`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="vendas-recibo-pdf-resumo"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "no-underline",
            )}
          >
            Baixar pedido de venda (PDF)
          </Link>
        </p>
      ) : null}
    </div>
  );
}
