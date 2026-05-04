import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ROLES_ACESSO_VENDAS,
  ROLES_ALTERAR_VENDEDOR_PDV,
} from "@/modules/vendas/lib/roles";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import {
  getVendasFilterLists,
  listPedidosForStore,
  parseVendasSearchParams,
} from "@/modules/vendas/vendas-queries";
import { VendasFiltersForm } from "@/modules/vendas/components/vendas-filters-form";
import { VendasEstadoPresetLinks } from "@/modules/vendas/components/vendas-estado-preset-links";
import { VendasPresetLinks } from "@/modules/vendas/components/vendas-preset-links";
import { VendasPdv } from "@/modules/vendas/components/vendas-pdv";
import { getPdvLojaOptions } from "@/modules/vendas/pdv-data";
import { buildVendasHref } from "@/modules/vendas/lib/build-href";
import { VendasPedidosTable } from "@/modules/vendas/components/vendas-pedidos-table";

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

  const pedidosListaVm = pedidos.map((p) => ({
    id: p.id,
    numero: p.numero,
    createdAt: p.createdAt.toISOString(),
    estado: p.estado,
    modalidade: p.modalidade,
    total: p.total != null ? Number(p.total) : null,
    clienteLabel: p.cliente ? clienteNomeCurto(p.cliente) : "A definir",
    vendedorName: p.vendedor.name,
    corretorName: p.corretor?.name ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos da loja{" "}
            <span className="font-medium text-foreground">{activeStore.name}</span>
            .{" "}
            <Link
              href="/contas-receber"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Contas a receber
            </Link>
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
          defaultColaboradorId={session.user.colaboradorId}
          clientes={pdvClientes}
          vendedores={pdvOpts.vendedores}
          corretores={pdvOpts.corretores}
          pdvPodeAlterarVendedorComPedido={ROLES_ALTERAR_VENDEDOR_PDV.includes(
            session.user.role,
          )}
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
              <VendasPedidosTable
                pedidos={pedidosListaVm}
                filterQueryString={sp.toString()}
              />
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
          <div className="rounded-lg border bg-card p-3">
            <VendasEstadoPresetLinks
              searchParams={sp}
              estado={filters.estado}
              estadoAberto={filters.estadoAberto}
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
                estadoAberto: filters.estadoAberto ?? "",
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
