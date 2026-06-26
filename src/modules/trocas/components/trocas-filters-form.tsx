"use client";

import type { TrocaEstado } from "@prisma/client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nativeSelectTrailingPadding } from "@/lib/native-select";
import { cn } from "@/lib/utils";
import {
  clearTrocasFiltersHref,
  mergeTrocasFiltersFromForm,
  TROCAS_FILTER_PARAM_KEYS,
} from "../lib/build-href";
import { VendasDateRangePicker } from "@/modules/vendas/components/vendas-date-range-picker";

type Option = { id: string; name: string };

type Props = {
  filters: {
    preset: string;
    estado: string;
    clienteId: string;
    vendedorId: string;
    busca: string;
    from: string;
    to: string;
  };
  vendedores: Option[];
  clientes: Option[];
};

const ESTADOS: { value: TrocaEstado; label: string }[] = [
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
];

const BUSCA_DEBOUNCE_MS = 450;

const selectClass = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent ps-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
  nativeSelectTrailingPadding,
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
);

export function TrocasFiltersForm({ filters, vendedores, clientes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = React.useRef<HTMLFormElement>(null);
  const presetRef = React.useRef<HTMLInputElement>(null);
  const buscaDebounceRef = React.useRef<number>(undefined);

  React.useEffect(
    () => () => window.clearTimeout(buscaDebounceRef.current),
    [],
  );

  const applyFilters = React.useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const next = mergeTrocasFiltersFromForm(searchParams, form);
    const qs = next.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  }, [pathname, router, searchParams]);

  const onBuscaInput = React.useCallback(() => {
    window.clearTimeout(buscaDebounceRef.current);
    buscaDebounceRef.current = window.setTimeout(applyFilters, BUSCA_DEBOUNCE_MS);
  }, [applyFilters]);

  const onRangeApply = React.useCallback(() => {
    if (presetRef.current) presetRef.current.value = "";
    applyFilters();
  }, [applyFilters]);

  const hasActiveFilters = React.useMemo(() => {
    for (const key of TROCAS_FILTER_PARAM_KEYS) {
      const v = searchParams.get(key);
      if (v != null && String(v).trim() !== "") return true;
    }
    return false;
  }, [searchParams]);

  const limparFiltros = React.useCallback(() => {
    const href = clearTrocasFiltersHref(new URLSearchParams(searchParams.toString()));
    router.replace(href, { scroll: false });
  }, [router, searchParams]);

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-lg border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        applyFilters();
      }}
    >
      <input
        ref={presetRef}
        type="hidden"
        name="preset"
        defaultValue={filters.preset}
      />

      <div className="space-y-1.5">
        <Label htmlFor="trocas-busca">Buscar</Label>
        <Input
          id="trocas-busca"
          name="busca"
          placeholder="Nº da troca ou nome do cliente"
          defaultValue={filters.busca}
          autoComplete="off"
          onChange={onBuscaInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              window.clearTimeout(buscaDebounceRef.current);
              applyFilters();
            }
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          Só números filtra pelo nº da troca; texto procura no nome / fantasia / razão social.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <VendasDateRangePicker
            defaultFrom={filters.from}
            defaultTo={filters.to}
            onApply={onRangeApply}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trocas-estado">Estado</Label>
          <select
            id="trocas-estado"
            name="estado"
            defaultValue={filters.estado || ""}
            className={selectClass}
            onChange={applyFilters}
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="space-y-1.5">
          <Label htmlFor="trocas-cliente">Cliente</Label>
          <select
            id="trocas-cliente"
            name="clienteId"
            defaultValue={filters.clienteId || ""}
            className={selectClass}
            onChange={applyFilters}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trocas-vendedor">Vendedor</Label>
          <select
            id="trocas-vendedor"
            name="vendedorId"
            defaultValue={filters.vendedorId || ""}
            className={selectClass}
            onChange={applyFilters}
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        A busca aplica após uma pausa ao digitar ou ao premir Enter. Os demais filtros aplicam
        ao alterar o campo. A URL reflete os filtros para poderes copiar o link.
      </p>

      {hasActiveFilters ? (
        <div className="flex justify-end border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="touch-manipulation"
            onClick={limparFiltros}
          >
            Limpar filtros
          </Button>
        </div>
      ) : null}
    </form>
  );
}
