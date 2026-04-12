import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { pedidoEstadoLabels, pedidoModalidadeLabels } from "@/modules/vendas/lib/labels";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { getPedidoDetalhe } from "@/modules/vendas/vendas-queries";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Props = { params: Promise<{ id: string }> };

function lineTotal(q: number, preco: Prisma.Decimal) {
  return new Prisma.Decimal(q).mul(preco);
}

export default async function VendaDetalhePage({ params }: Props) {
  await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const { id } = await params;
  const pedido = await getPedidoDetalhe(
    activeStore.tenantId,
    activeStore.id,
    id,
  );
  if (!pedido) notFound();

  const totalItens = pedido.itens.reduce(
    (acc, it) => acc.add(lineTotal(it.quantidade, it.precoUnitario)),
    new Prisma.Decimal(0),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/vendas"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Vendas
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Pedido nº {pedido.numero}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {pedido.createdAt.toLocaleString("pt-BR", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{pedidoEstadoLabels[pedido.estado]}</Badge>
            <Badge variant="outline">{pedidoModalidadeLabels[pedido.modalidade]}</Badge>
            {pedido.estado === "EM_ANDAMENTO" ? (
              <Link
                href={`/vendas?pdv=1&edit=${pedido.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Continuar no PDV
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
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
          <p className="mt-1 font-medium">{activeStore.name}</p>
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

      <div>
        <h2 className="text-lg font-medium">Itens</h2>
        <div className="mt-3 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Variação</th>
                <th className="px-4 py-3 text-right font-medium">Qtd</th>
                <th className="px-4 py-3 text-right font-medium">Preço unit.</th>
                <th className="px-4 py-3 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedido.itens.map((it) => {
                const sub = lineTotal(it.quantidade, it.precoUnitario);
                return (
                  <tr key={it.id} className="bg-card">
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {it.produtoVariacao.produto.nome}
                      </span>
                      {it.produtoVariacao.produto.referencia && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({it.produtoVariacao.produto.referencia})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {it.produtoVariacao.nome}
                      {it.produtoVariacao.ean13 && (
                        <span className="ml-2 font-mono text-xs">
                          · {it.produtoVariacao.ean13}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{it.quantidade}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money.format(Number(it.precoUnitario))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {money.format(Number(sub))}
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
          <span className="tabular-nums font-medium">
            {money.format(Number(totalItens))}
          </span>
        </div>
        <div className="flex w-full max-w-sm justify-between text-base">
          <span className="font-medium">Total do pedido</span>
          <span className="tabular-nums font-semibold">
            {pedido.total != null
              ? money.format(Number(pedido.total))
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
