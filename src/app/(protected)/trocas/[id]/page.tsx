import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { getTrocaDetalhe } from "@/modules/trocas/troca-queries";
import { TrocaEstadoBadge } from "@/modules/trocas/components/troca-estado-badge";
import { formatDateBr } from "@/lib/format-date-br";
import { ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function TrocaDetalhePage({ params }: Props) {
  await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const { id } = await params;
  const result = await getTrocaDetalhe({ storeId: activeStore.id, trocaId: id });

  if ("error" in result) notFound();

  const t = result.data;

  return (
    <div className="container max-w-4xl space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link href="/trocas" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Troca #{t.numero}</h1>
          <p className="text-sm text-muted-foreground">{formatDateBr(t.createdAt)}</p>
        </div>
        <TrocaEstadoBadge estado={t.estado} />
      </div>

      {/* Summary card */}
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-medium">{t.clienteNome}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vendedor</p>
          <p className="font-medium">{t.vendedorNome}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Crédito gerado</p>
          <p className="font-semibold tabular-nums text-emerald-600">{BRL.format(t.creditoGerado)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Crédito remanescente</p>
          <p className="font-semibold tabular-nums text-sky-600">
            {t.creditoRemanescente > 0.004 ? BRL.format(t.creditoRemanescente) : "—"}
          </p>
        </div>
      </div>

      {/* Items devolvidos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Itens devolvidos</h2>
        {t.itensDevolvidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item registado.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Produto</th>
                  <th className="px-3 py-2.5 font-medium">Qtd</th>
                  <th className="px-3 py-2.5 text-right font-medium">Valor un.</th>
                  <th className="px-3 py-2.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {t.itensDevolvidos.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2.5">{it.label}</td>
                    <td className="px-3 py-2.5 tabular-nums">{it.quantidade}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {BRL.format(it.valorUnitario)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      {BRL.format(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pedido de saída */}
      {t.pedidoSaidaId && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex-1">
            <p className="text-sm font-medium">Pedido de saída associado</p>
            <p className="text-xs text-muted-foreground">
              Crédito consumido: {BRL.format(t.creditoConsumido)}
            </p>
          </div>
          <Link
            href={`/vendas?view=${t.pedidoSaidaId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver pedido
          </Link>
        </div>
      )}

      {/* Observações */}
      {t.observacoes && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Observações</p>
          <p className="text-sm whitespace-pre-wrap">{t.observacoes}</p>
        </div>
      )}
    </div>
  );
}
