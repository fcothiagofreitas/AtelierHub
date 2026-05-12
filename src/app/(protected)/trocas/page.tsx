import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  listTrocasForStore,
  parseTrocasSearchParams,
} from "@/modules/trocas/trocas-queries";
import { buildTrocasHref } from "@/modules/trocas/lib/build-href";
import { TrocasFiltersForm } from "@/modules/trocas/components/trocas-filters-form";
import { TrocasPresetLinks } from "@/modules/trocas/components/trocas-preset-links";
import { TrocasPdv } from "@/modules/trocas/components/trocas-pdv";
import { TrocasTable } from "@/modules/trocas/components/trocas-table";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { getPdvLojaOptions } from "@/modules/vendas/pdv-data";
import {
  getVendasFilterLists,
} from "@/modules/vendas/vendas-queries";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrocasPage({ searchParams }: Props) {
  const session = await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const raw = searchParams ? await searchParams : {};
  const filters = parseTrocasSearchParams(raw);
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) sp.set(k, v);
  }

  const hasCustomRange =
    Boolean(filters.from?.trim()) || Boolean(filters.to?.trim());

  const [rows, filterLists, pdvOpts] = await Promise.all([
    listTrocasForStore(session.user.tenantId, activeStore.id, filters),
    getVendasFilterLists(session.user.tenantId, activeStore.id),
    getPdvLojaOptions(session.user.tenantId, activeStore.id),
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
          <h1 className="text-2xl font-semibold tracking-tight">Trocas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Devoluções com crédito ao cliente na loja{" "}
            <span className="font-medium text-foreground">{activeStore.name}</span>
            .
          </p>
        </div>
        <Link
          href={buildTrocasHref(sp, { pdv: "1" })}
          className={cn(buttonVariants(), "shrink-0")}
        >
          <Plus className="size-4" />
          Nova troca
        </Link>
      </div>

      <Suspense fallback={null}>
        <TrocasPdv
          storeId={activeStore.id}
          defaultColaboradorId={session.user.colaboradorId}
          clientes={pdvClientes}
          vendedores={pdvOpts.vendedores}
        />
      </Suspense>

      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start"
        dir="ltr"
      >
        <section
          aria-label="Lista de trocas"
          className="min-w-0 lg:col-span-8 lg:col-start-1"
        >
          <div className="overflow-hidden rounded-lg border bg-card">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma troca encontrada com os filtros atuais.
              </p>
            ) : (
              <TrocasTable rows={rows} />
            )}
          </div>
        </section>

        <aside
          aria-label="Filtros"
          className="space-y-4 lg:sticky lg:top-4 lg:col-span-4 lg:col-start-9 lg:self-start"
        >
          <div className="rounded-lg border bg-card p-3">
            <TrocasPresetLinks
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
            <TrocasFiltersForm
              key={sp.toString()}
              filters={{
                preset: filters.preset ?? "",
                clienteId: filters.clienteId ?? "",
                tipoFluxo: filters.tipoFluxo ?? "",
                busca: filters.busca ?? "",
                from: filters.from ?? "",
                to: filters.to ?? "",
              }}
              clientes={clienteOptions}
            />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
