import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { getPdvLojaOptions } from "@/modules/vendas/pdv-data";
import { listarTrocas } from "@/modules/trocas/troca-queries";
import { parseTrocasSearchParams } from "@/modules/trocas/lib/date-range";
import { getTrocasFilterLists } from "@/modules/trocas/troca-filter-lists";
import { TrocaPdv } from "@/modules/trocas/components/troca-pdv";
import { TrocasTable } from "@/modules/trocas/components/trocas-table";
import { TrocasFiltersForm } from "@/modules/trocas/components/trocas-filters-form";
import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { buildTrocasHref } from "@/modules/trocas/lib/build-href";

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

  const [result, filterLists, pdvOpts] = await Promise.all([
    listarTrocas({ storeId: activeStore.id, filters, take: 40 }),
    getTrocasFilterLists(activeStore.tenantId, activeStore.id),
    getPdvLojaOptions(activeStore.tenantId, activeStore.id),
  ]);

  const trocas = "error" in result ? [] : result.rows;
  const total = "error" in result ? 0 : result.total;

  const clientes = pdvOpts.clientes.map((c) => ({
    id: c.id,
    name: clienteNomeCurto(c),
    creditoTroca: c.creditoTroca.toNumber(),
  }));
  const vendedores = pdvOpts.vendedores.map((v) => ({ id: v.id, name: v.name }));
  const defaultClienteId = pdvOpts.clientes.find((c) => c.vendaRapidaPadrao)?.id ?? "";
  const defaultColaboradorId = session.user.colaboradorId ?? vendedores[0]?.id ?? "";

  const filterClienteOptions = filterLists.clientes.map((c) => ({
    id: c.id,
    name: clienteNomeCurto(c),
  }));

  return (
    <div className="space-y-6">
      {/* Modal PDV */}
      <Suspense fallback={null}>
        <TrocaPdv
          storeId={activeStore.id}
          defaultColaboradorId={defaultColaboradorId}
          defaultClienteId={defaultClienteId}
          clientes={clientes}
          vendedores={vendedores}
        />
      </Suspense>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trocas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trocas da loja{" "}
            <span className="font-medium text-foreground">{activeStore.name}</span>.
          </p>
        </div>
        <Link
          href={buildTrocasHref(sp, { pdv: "1", edit: null, view: null })}
          className={cn(buttonVariants(), "gap-2")}
        >
          <Plus className="size-4" />
          Nova troca
        </Link>
      </div>

      {/* Grid: lista + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start" dir="ltr">
        {/* Lista */}
        <section
          aria-label="Lista de trocas"
          className="min-w-0 lg:col-span-8 lg:col-start-1"
        >
          <div className="overflow-hidden rounded-lg border bg-card">
            {trocas.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma troca encontrada com os filtros atuais.
              </p>
            ) : (
              <TrocasTable trocas={trocas} />
            )}
          </div>
        </section>

        {/* Sidebar de filtros */}
        <aside
          aria-label="Filtros"
          className="space-y-4 lg:sticky lg:top-4 lg:col-span-4 lg:col-start-9 lg:self-start"
        >
          <div className="rounded-lg border bg-card p-3">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Total
            </p>
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? "troca" : "trocas"} encontradas
            </p>
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
                estado: filters.estado ?? "",
                clienteId: filters.clienteId ?? "",
                vendedorId: filters.vendedorId ?? "",
                busca: filters.busca ?? "",
                from: filters.from ?? "",
                to: filters.to ?? "",
              }}
              vendedores={filterLists.vendedores}
              clientes={filterClienteOptions}
            />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
