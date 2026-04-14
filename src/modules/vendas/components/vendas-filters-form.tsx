"use client";

import type { PedidoEstado } from "@prisma/client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  clearVendasFiltersHref,
  mergeVendasFiltersFromForm,
  VENDAS_FILTER_PARAM_KEYS,
} from "../lib/build-href";
import { pedidoEstadoLabels } from "../lib/labels";
import { VendasDateRangePicker } from "./vendas-date-range-picker";

type Option = { id: string; name: string };

type Props = {
  filters: {
    preset: string;
    estado: string;
    estadoAberto: string;
    clienteId: string;
    vendedorId: string;
    corretorId: string;
    busca: string;
    from: string;
    to: string;
  };
  vendedores: Option[];
  corretores: Option[];
  clientes: Option[];
};

const ESTADOS: PedidoEstado[] = [
  "EM_ANDAMENTO",
  "EM_ABERTO",
  "PAGO_PARCIAL",
  "QUITADO",
  "CANCELADO",
];

const BUSCA_DEBOUNCE_MS = 450;

const selectClass = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
);

export function VendasFiltersForm({
  filters,
  vendedores,
  corretores,
  clientes,
}: Props) {
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
    const next = mergeVendasFiltersFromForm(searchParams, form);
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
    for (const key of VENDAS_FILTER_PARAM_KEYS) {
      const v = searchParams.get(key);
      if (v != null && String(v).trim() !== "") return true;
    }
    return false;
  }, [searchParams]);

  const limparFiltros = React.useCallback(() => {
    const href = clearVendasFiltersHref(new URLSearchParams(searchParams.toString()));
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
      {hasActiveFilters ? (
        <div className="flex justify-end border-b border-border/60 pb-3">
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
      <input
        ref={presetRef}
        type="hidden"
        name="preset"
        defaultValue={filters.preset}
      />
      <input
        type="hidden"
        name="estadoAberto"
        defaultValue={filters.estadoAberto === "1" ? "1" : ""}
      />

      <div className="space-y-1.5">
        <Label htmlFor="vendas-busca">Buscar</Label>
        <Input
          id="vendas-busca"
          name="busca"
          placeholder="Nº do pedido ou nome do cliente"
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
          Só números filtra pelo nº do pedido; texto procura no nome / fantasia / razão
          social.
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
          <Label htmlFor="vendas-estado">Estado</Label>
          <select
            id="vendas-estado"
            name="estado"
            defaultValue={filters.estado || ""}
            className={selectClass}
            onChange={(e) => {
              const h = formRef.current?.querySelector<HTMLInputElement>(
                'input[name="estadoAberto"]',
              );
              if (h && e.target.value.trim() !== "") h.value = "";
              applyFilters();
            }}
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {pedidoEstadoLabels[e]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="space-y-1.5">
          <Label htmlFor="vendas-cliente">Cliente</Label>
          <select
            id="vendas-cliente"
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
          <Label htmlFor="vendas-vendedor">Vendedor</Label>
          <select
            id="vendas-vendedor"
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
        <div className="space-y-1.5">
          <Label htmlFor="vendas-corretor">Corretor</Label>
          <select
            id="vendas-corretor"
            name="corretorId"
            defaultValue={filters.corretorId || ""}
            className={selectClass}
            onChange={applyFilters}
          >
            <option value="">Todos</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        A busca aplica após uma pausa ao digitar ou ao premir Enter. Os restantes
        filtros aplicam ao alterar o campo. A lista atualiza sem recarregar o
        documento; a URL reflete os filtros para poderes copiar o link.
      </p>
    </form>
  );
}
