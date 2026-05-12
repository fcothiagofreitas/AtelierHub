"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { clientRandomId } from "@/lib/random-id";
import {
  trocaCreateDraft,
  trocaSaveItensDevolvidos,
  trocaConfirmar,
  trocaCancelar,
} from "@/modules/trocas/troca-actions";
import {
  pdvSearchVariacoes,
  pdvResolverEan,
  type PdvSearchRow,
} from "@/modules/vendas/pdv-actions";

type SelectOption = { id: string; name: string };

type ClienteOption = SelectOption & { creditoTroca: number };

type CartLine = {
  key: string;
  produtoVariacaoId: string;
  label: string;
  quantidade: number;
  precoUnitario: string;
  saldoRef: number;
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function cartTotal(lines: CartLine[]): number {
  return lines.reduce((acc, L) => {
    const n = Number(String(L.precoUnitario).replace(",", "."));
    return acc + (Number.isFinite(n) ? n : 0) * L.quantidade;
  }, 0);
}

const panelClass =
  "rounded-xl border border-border bg-card shadow-xs ring-1 ring-foreground/5";
const panelMutedClass =
  "rounded-xl border border-border bg-muted/25 shadow-xs ring-1 ring-foreground/5";

export type TrocaPdvProps = {
  storeId: string;
  defaultColaboradorId: string;
  clientes: ClienteOption[];
  vendedores: SelectOption[];
};

export function TrocaPdv({ storeId, defaultColaboradorId, clientes, vendedores }: TrocaPdvProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  // Header fields
  const [clienteId, setClienteId] = React.useState("");
  const [clienteQuery, setClienteQuery] = React.useState("");
  const [clienteListaAberta, setClienteListaAberta] = React.useState(false);
  const [creditoAcumulado, setCreditoAcumulado] = React.useState(0);
  const clienteCampoRef = React.useRef<HTMLDivElement>(null);
  const [vendedorId, setVendedorId] = React.useState(() =>
    vendedores.some((v) => v.id === defaultColaboradorId)
      ? defaultColaboradorId
      : (vendedores[0]?.id ?? ""),
  );
  const [observacoes, setObservacoes] = React.useState("");

  // Devolvidos cart
  const [devolvidos, setDevolvidos] = React.useState<CartLine[]>([]);
  const [qDev, setQDev] = React.useState("");
  const [busyDev, setBusyDev] = React.useState(false);
  const [hitsDev, setHitsDev] = React.useState<PdvSearchRow[]>([]);
  const [listaDevAberta, setListaDevAberta] = React.useState(false);
  const devBuscaRef = React.useRef<HTMLDivElement>(null);
  const devInputRef = React.useRef<HTMLInputElement>(null);

  // Novos cart
  const [novos, setNovos] = React.useState<CartLine[]>([]);
  const [qNov, setQNov] = React.useState("");
  const [busyNov, setBusyNov] = React.useState(false);
  const [hitsNov, setHitsNov] = React.useState<PdvSearchRow[]>([]);
  const [listaNovAberta, setListaNovAberta] = React.useState(false);
  const novBuscaRef = React.useRef<HTMLDivElement>(null);
  const novInputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    if (!clienteListaAberta) return;
    const fn = (e: MouseEvent) => {
      if (clienteCampoRef.current && !clienteCampoRef.current.contains(e.target as Node)) {
        setClienteListaAberta(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [clienteListaAberta]);

  React.useEffect(() => {
    if (!listaDevAberta) return;
    const fn = (e: MouseEvent) => {
      if (devBuscaRef.current && !devBuscaRef.current.contains(e.target as Node)) {
        setListaDevAberta(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [listaDevAberta]);

  React.useEffect(() => {
    if (!listaNovAberta) return;
    const fn = (e: MouseEvent) => {
      if (novBuscaRef.current && !novBuscaRef.current.contains(e.target as Node)) {
        setListaNovAberta(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [listaNovAberta]);

  const clientesFiltrados = React.useMemo(() => {
    const q = clienteQuery.trim().toLowerCase();
    const list = clientes.map((c) => ({ id: c.id, label: c.name, creditoTroca: c.creditoTroca }));
    if (!q) return list.slice(0, 50);
    return list.filter((r) => r.label.toLowerCase().includes(q)).slice(0, 50);
  }, [clientes, clienteQuery]);

  const buscarProdutos = React.useCallback(
    async (q: string, setter: typeof setHitsDev, setAberta: typeof setListaDevAberta, setBusyFn: typeof setBusyDev) => {
      setBusyFn(true);
      try {
        const r = await pdvSearchVariacoes({ storeId, query: q.trim(), pageSize: 12 });
        if ("error" in r) {
          toast.error(r.error);
          return;
        }
        setter(r.rows);
        setAberta(true);
      } finally {
        setBusyFn(false);
      }
    },
    [storeId],
  );

  const resolverEanEAdicionar = React.useCallback(
    async (raw: string, setLines: React.Dispatch<React.SetStateAction<CartLine[]>>, suppressSet: () => void) => {
      const r = await pdvResolverEan({ storeId, eanRaw: raw });
      if ("error" in r) {
        toast.error(r.error);
        return false;
      }
      if (!r.found) {
        toast.error("EAN não encontrado.");
        return false;
      }
      setLines((prev) => adicionarOuIncrementar(prev, r.row));
      suppressSet();
      return true;
    },
    [storeId],
  );

  function adicionarOuIncrementar(prev: CartLine[], row: PdvSearchRow): CartLine[] {
    const ex = prev.find((p) => p.produtoVariacaoId === row.id);
    if (ex) {
      return prev.map((p) =>
        p.produtoVariacaoId === row.id
          ? { ...p, quantidade: row.saldo > 0 ? Math.min(p.quantidade + 1, row.saldo) : p.quantidade + 1 }
          : p,
      );
    }
    return [
      ...prev,
      {
        key: clientRandomId(),
        produtoVariacaoId: row.id,
        label: `${row.produtoNome} — ${row.nome}`,
        quantidade: 1,
        precoUnitario: row.precoSugerido ?? "0",
        saldoRef: row.saldo,
      },
    ];
  }

  const creditoGerado = cartTotal(devolvidos);
  const totalNovos = cartTotal(novos);
  const saldoDevedor = Math.max(0, totalNovos - creditoGerado);
  const creditoRemanescente = Math.max(0, creditoGerado - totalNovos);

  const confirmar = async () => {
    if (!clienteId.trim()) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (!vendedorId.trim()) {
      toast.error("Selecione um vendedor.");
      return;
    }
    if (devolvidos.length === 0) {
      toast.error("Adicione ao menos um item devolvido.");
      return;
    }

    setBusy(true);
    try {
      // 1. Create draft
      const draft = await trocaCreateDraft({ storeId, clienteId, vendedorId });
      if ("error" in draft) {
        toast.error(draft.error);
        return;
      }
      const trocaId = draft.trocaId;

      // 2. Save devolvidos items
      const saveR = await trocaSaveItensDevolvidos({
        storeId,
        trocaId,
        itens: devolvidos.map((L) => ({
          produtoVariacaoId: L.produtoVariacaoId,
          quantidade: L.quantidade,
          valorUnitario: L.precoUnitario,
        })),
      });
      if ("error" in saveR) {
        // Try to cancel the draft before returning the error
        await trocaCancelar({ storeId, trocaId });
        toast.error(saveR.error);
        return;
      }

      // 3. Confirm
      const r = await trocaConfirmar({
        storeId,
        trocaId,
        itensNovos: novos.map((L) => ({
          produtoVariacaoId: L.produtoVariacaoId,
          quantidade: L.quantidade,
          precoUnitario: L.precoUnitario,
        })),
        observacoes: observacoes || undefined,
      });

      if ("error" in r) {
        await trocaCancelar({ storeId, trocaId });
        toast.error(r.error);
        return;
      }

      if (r.saldoDevedor > 0.004) {
        toast.success(
          `Troca concluída. Saldo a pagar: ${BRL.format(r.saldoDevedor)}`,
        );
      } else if (creditoRemanescente > 0.004) {
        toast.success(
          `Troca concluída. Crédito remanescente: ${BRL.format(creditoRemanescente)} adicionado ao cliente.`,
        );
      } else {
        toast.success("Troca concluída com sucesso.");
      }

      router.push("/trocas");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header: cliente + vendedor */}
      <section className={cn("p-4 space-y-4", panelClass)}>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Troca — Cliente e Vendedor
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <div ref={clienteCampoRef} className="relative">
              <Input
                autoComplete="off"
                placeholder="Buscar cliente…"
                value={clienteQuery}
                onChange={(e) => {
                  setClienteQuery(e.target.value);
                  setClienteId("");
                  setCreditoAcumulado(0);
                  setClienteListaAberta(true);
                }}
                onFocus={() => setClienteListaAberta(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setClienteListaAberta(false);
                }}
                disabled={busy}
              />
              {clienteListaAberta && clientesFiltrados.length > 0 && (
                <ul className="absolute top-full left-0 right-0 z-30 mt-1 max-h-52 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10">
                  {clientesFiltrados.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="flex w-full px-3 py-2 text-left hover:bg-muted/60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setClienteId(row.id);
                          setClienteQuery(row.label);
                          setCreditoAcumulado(row.creditoTroca);
                          setClienteListaAberta(false);
                        }}
                      >
                        <span className="flex-1">{row.label}</span>
                        {row.creditoTroca > 0.004 && (
                          <span className="ml-2 text-xs text-emerald-600">
                            crédito {BRL.format(row.creditoTroca)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {creditoAcumulado > 0.004 && (
              <p className="text-xs text-emerald-600">
                Crédito acumulado: {BRL.format(creditoAcumulado)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Vendedor</Label>
            <select
              className="flex h-10 min-h-10 w-full rounded-md border border-input bg-transparent ps-3 pe-10 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              disabled={busy}
            >
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Observações (opcional)</Label>
          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            disabled={busy}
            placeholder="Notas sobre a troca…"
            className="min-h-[3rem] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </section>

      {/* Two-cart grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Devolvidos */}
        <TrocaCart
          title="Devolvidos (entram no estoque)"
          accent="blue"
          lines={devolvidos}
          setLines={setDevolvidos}
          q={qDev}
          setQ={setQDev}
          busy={busyDev}
          hits={hitsDev}
          setHits={setHitsDev}
          listaAberta={listaDevAberta}
          setListaAberta={setListaDevAberta}
          buscaRef={devBuscaRef}
          inputRef={devInputRef}
          disabled={busy}
          onBuscar={() => buscarProdutos(qDev, setHitsDev, setListaDevAberta, setBusyDev)}
          onEan={(raw) =>
            resolverEanEAdicionar(raw, setDevolvidos, () => {
              setQDev("");
              setListaDevAberta(false);
            })
          }
          showPreco
          totalLabel="Crédito gerado"
          total={creditoGerado}
          totalColor="text-emerald-600"
        />

        {/* Novos */}
        <TrocaCart
          title="Novos (saem do estoque)"
          accent="orange"
          lines={novos}
          setLines={setNovos}
          q={qNov}
          setQ={setQNov}
          busy={busyNov}
          hits={hitsNov}
          setHits={setHitsNov}
          listaAberta={listaNovAberta}
          setListaAberta={setListaNovAberta}
          buscaRef={novBuscaRef}
          inputRef={novInputRef}
          disabled={busy}
          onBuscar={() => buscarProdutos(qNov, setHitsNov, setListaNovAberta, setBusyNov)}
          onEan={(raw) =>
            resolverEanEAdicionar(raw, setNovos, () => {
              setQNov("");
              setListaNovAberta(false);
            })
          }
          showPreco
          totalLabel="Total a pagar"
          total={totalNovos}
          totalColor="text-foreground"
        />
      </div>

      {/* Credit summary + confirm */}
      <section className={cn("p-4 space-y-4", panelMutedClass)}>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Resumo do crédito
        </p>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Crédito gerado</span>
            <span className="text-base font-semibold tabular-nums text-emerald-600">
              {BRL.format(creditoGerado)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total novos</span>
            <span className="text-base font-semibold tabular-nums">{BRL.format(totalNovos)}</span>
          </div>
          <div className="flex flex-col">
            {saldoDevedor > 0.004 ? (
              <>
                <span className="text-xs text-muted-foreground">Saldo a pagar</span>
                <span className="text-base font-semibold tabular-nums text-amber-600">
                  {BRL.format(saldoDevedor)}
                </span>
              </>
            ) : creditoRemanescente > 0.004 ? (
              <>
                <span className="text-xs text-muted-foreground">Crédito remanescente</span>
                <span className="text-base font-semibold tabular-nums text-sky-600">
                  {BRL.format(creditoRemanescente)}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">Saldo</span>
                <span className="text-base font-semibold tabular-nums text-emerald-600">Quitado</span>
              </>
            )}
          </div>
        </div>
        {saldoDevedor > 0.004 && (
          <p className="text-xs text-muted-foreground">
            O cliente precisará pagar {BRL.format(saldoDevedor)} adicionalmente. Um pedido de venda
            será criado com modalidade <Badge variant="outline">Troca</Badge>.
          </p>
        )}
        {creditoRemanescente > 0.004 && (
          <p className="text-xs text-muted-foreground">
            O crédito remanescente de {BRL.format(creditoRemanescente)} será adicionado à conta do
            cliente (sem troco em dinheiro).
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/trocas")}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={busy} className="min-w-36">
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Confirmando…
              </>
            ) : (
              "Confirmar troca"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}

type TrocaCartProps = {
  title: string;
  accent: "blue" | "orange";
  lines: CartLine[];
  setLines: React.Dispatch<React.SetStateAction<CartLine[]>>;
  q: string;
  setQ: (v: string) => void;
  busy: boolean;
  hits: PdvSearchRow[];
  setHits: (v: PdvSearchRow[]) => void;
  listaAberta: boolean;
  setListaAberta: (v: boolean) => void;
  buscaRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
  onBuscar: () => void;
  onEan: (raw: string) => Promise<boolean>;
  showPreco: boolean;
  totalLabel: string;
  total: number;
  totalColor: string;
};

function TrocaCart({
  title,
  lines,
  setLines,
  q,
  setQ,
  busy,
  hits,
  listaAberta,
  setListaAberta,
  buscaRef,
  inputRef,
  disabled,
  onBuscar,
  onEan,
  showPreco,
  totalLabel,
  total,
  totalColor,
}: TrocaCartProps) {
  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const addRow = (row: PdvSearchRow) => {
    setLines((prev) => {
      const ex = prev.find((p) => p.produtoVariacaoId === row.id);
      if (ex) {
        return prev.map((p) =>
          p.produtoVariacaoId === row.id
            ? { ...p, quantidade: row.saldo > 0 ? Math.min(p.quantidade + 1, row.saldo) : p.quantidade + 1 }
            : p,
        );
      }
      return [
        ...prev,
        {
          key: clientRandomId(),
          produtoVariacaoId: row.id,
          label: `${row.produtoNome} — ${row.nome}`,
          quantidade: 1,
          precoUnitario: row.precoSugerido ?? "0",
          saldoRef: row.saldo,
        },
      ];
    });
    setListaAberta(false);
    if (row.saldo <= 0) toast.message("Atenção: saldo zero para este SKU.");
  };

  return (
    <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>

      {/* Search */}
      <div ref={buscaRef} className="relative">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              className="pl-8"
              placeholder="Nome, referência ou EAN…"
              value={q}
              autoComplete="off"
              disabled={disabled}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setListaAberta(false);
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  const raw = q.trim();
                  if (raw && /^\d{8,14}$/.test(raw)) {
                    void onEan(raw).then((found) => {
                      if (found) setQ("");
                    });
                  } else {
                    onBuscar();
                  }
                }
                if (e.key === "Tab") {
                  const digits = q.replace(/\D/g, "");
                  if (digits.length >= 8 && digits.length <= 14) {
                    e.preventDefault();
                    void onEan(q).then((found) => {
                      if (found) setQ("");
                    });
                  }
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={busy || disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              inputRef.current?.focus({ preventScroll: true });
              onBuscar();
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </div>

        {listaAberta && hits.length > 0 && (
          <ul className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted/60"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addRow(h)}
                >
                  <span className="font-medium">
                    {h.produtoNome} — {h.nome}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Saldo: {h.saldo}
                    {h.ean13 ? ` · ${h.ean13}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {listaAberta && hits.length === 0 && !busy && (
          <div className="absolute top-full right-0 left-0 z-30 mt-1 rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
            Nenhum produto encontrado.
          </div>
        )}
      </div>

      {/* Items table */}
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          Nenhum item adicionado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[360px] text-xs sm:text-sm">
            <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="px-2 py-1.5 font-medium sm:px-3">Produto</th>
                <th className="px-2 py-1.5 font-medium sm:px-3">Qtd</th>
                {showPreco && (
                  <th className="px-2 py-1.5 text-right font-medium sm:px-3">Valor un.</th>
                )}
                <th className="px-2 py-1.5 text-right font-medium sm:px-3">Subtotal</th>
                <th className="w-10 px-1 sm:px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((L) => {
                const precoNum = Number(String(L.precoUnitario).replace(",", "."));
                const sub = (Number.isFinite(precoNum) ? precoNum : 0) * L.quantidade;
                return (
                  <tr key={L.key} className="bg-card">
                    <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                      <span className="font-medium">{L.label}</span>
                    </td>
                    <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={disabled}
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((x) =>
                                x.key === L.key
                                  ? { ...x, quantidade: Math.max(1, x.quantidade - 1) }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="min-w-[2ch] text-center tabular-nums">{L.quantidade}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={disabled}
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((x) =>
                                x.key === L.key
                                  ? {
                                      ...x,
                                      quantidade:
                                        x.saldoRef > 0
                                          ? Math.min(x.saldoRef, x.quantidade + 1)
                                          : x.quantidade + 1,
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </td>
                    {showPreco && (
                      <td className="px-2 py-1.5 text-right align-middle sm:px-3 sm:py-2">
                        <Input
                          className="ml-auto h-8 max-w-[6rem] font-mono text-xs tabular-nums"
                          inputMode="decimal"
                          value={L.precoUnitario}
                          disabled={disabled}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((x) =>
                                x.key === L.key ? { ...x, precoUnitario: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-right align-middle tabular-nums sm:px-3 sm:py-2">
                      {BRL.format(sub)}
                    </td>
                    <td className="px-1 py-1.5 text-right align-middle sm:px-2 sm:py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={disabled}
                        onClick={() =>
                          setLines((prev) => prev.filter((x) => x.key !== L.key))
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-baseline justify-end gap-2 border-t border-border pt-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {totalLabel}
        </span>
        <span className={cn("text-lg font-semibold tabular-nums tracking-tight", totalColor)}>
          {BRL.format(total)}
        </span>
      </div>
    </section>
  );
}
