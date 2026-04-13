import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { pedidoEstadoLabels, pedidoModalidadeLabels } from "@/modules/vendas/lib/labels";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import {
  getVendasFilterLists,
  listPedidosForStore,
  parseVendasSearchParams,
} from "@/modules/vendas/vendas-queries";
import { VendasFiltersForm } from "@/modules/vendas/components/vendas-filters-form";
import { VendasPresetLinks } from "@/modules/vendas/components/vendas-preset-links";
import { VendasPdv } from "@/modules/vendas/components/vendas-pdv";
import { getPdvLojaOptions } from "@/modules/vendas/pdv-data";
import { buildVendasHref } from "@/modules/vendas/lib/build-href";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VendasPage({ searchParams }: Props) {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const raw = searchParams ? await searchParams : {};
  const filters = parseVendasSearchParams(raw);
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) sp.set(k, v);
  }

  const hasCustomRange = Boolean(filters.from?.trim()) || Boolean(filters.to?.trim());

  const [pedidos, filterLists, pdvOpts] = await Promise.all([
    listPedidosForStore(activeStore.tenantId, activeStore.id, filters),
    getVendasFilterLists(activeStore.tenantId, activeStore.id),
    getPdvLojaOptions(activeStore.tenantId, activeStore.id),
  ]);

  const clienteOptions = filterLists.clientes.map((c) => ({
    id: c.id,
    name: clienteNomeCurto(c),
  }));

  const pdvClientes = pdvOpts.clientes.map((c) => ({
    id: c.id,
    name: clienteNomeCurto(c),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos da loja{" "}
            <span className="font-medium text-foreground">{activeStore.name}</span>.
          </p>
        </div>
        <Link
          href={buildVendasHref(sp, { pdv: "1", edit: null, view: null })}
          className={cn(buttonVariants())}
        >
          Nova venda
        </Link>
      </div>

      <Suspense fallback={null}>
        <VendasPdv
          storeId={activeStore.id}
          storeName={activeStore.name}
          defaultColaboradorId={session.user.colaboradorId}
          clientes={pdvClientes}
          vendedores={pdvOpts.vendedores}
          corretores={pdvOpts.corretores}
        />
      </Suspense>

      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
        dir="ltr"
      >
        <section
          aria-label="Lista de pedidos"
          className="min-w-0 lg:col-span-8 lg:col-start-1"
        >
          <div className="overflow-hidden rounded-lg border bg-card">
            {pedidos.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nenhum pedido encontrado com os filtros atuais.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nº</th>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Vendedor</th>
                      <th className="px-4 py-3 font-medium">Corretor</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Modalidade</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pedidos.map((p) => (
                      <tr key={p.id} className="bg-card">
                        <td className="px-4 py-3 font-mono tabular-nums">{p.numero}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.createdAt.toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {p.cliente ? clienteNomeCurto(p.cliente) : "A definir"}
                        </td>
                        <td className="px-4 py-3">{p.vendedor.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.corretor?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {pedidoEstadoLabels[p.estado]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {pedidoModalidadeLabels[p.modalidade]}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {p.total != null ? money.format(Number(p.total)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                            {p.estado === "EM_ANDAMENTO" ? (
                              <Link
                                href={buildVendasHref(sp, {
                                  pdv: "1",
                                  edit: p.id,
                                  view: null,
                                })}
                                className="text-primary text-xs font-medium hover:underline"
                              >
                                Editar
                              </Link>
                            ) : null}
                            <Link
                              href={buildVendasHref(sp, {
                                pdv: "1",
                                view: p.id,
                                edit: null,
                              })}
                              className="text-primary text-xs font-medium hover:underline"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside
          aria-label="Filtros"
          className="space-y-4 lg:sticky lg:top-4 lg:col-span-4 lg:col-start-9 lg:self-start"
        >
          <div className="rounded-lg border bg-card p-3">
            <VendasPresetLinks
              searchParams={sp}
              activePreset={filters.preset}
              hasCustomRange={hasCustomRange}
            />
          </div>
          <Suspense
            fallback={
              <div
                className="h-64 animate-pulse rounded-lg border bg-card p-4"
                aria-hidden
              />
            }
          >
            <VendasFiltersForm
              key={sp.toString()}
              filters={{
                preset: filters.preset ?? "",
                estado: filters.estado ?? "",
                clienteId: filters.clienteId ?? "",
                vendedorId: filters.vendedorId ?? "",
                corretorId: filters.corretorId ?? "",
                busca: filters.busca ?? "",
                from: filters.from ?? "",
                to: filters.to ?? "",
              }}
              vendedores={filterLists.vendedores}
              corretores={filterLists.corretores}
              clientes={clienteOptions}
            />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
