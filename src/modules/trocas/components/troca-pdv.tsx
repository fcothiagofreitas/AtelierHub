"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { clientRandomId } from "@/lib/random-id";
import { formatDateBr } from "@/lib/format-date-br";
import {
  trocaCreateDraft,
  trocaSaveItensDevolvidos,
  trocaConfirmar,
  trocaCancelar,
} from "@/modules/trocas/troca-actions";
import {
  getTrocaDetalhe,
  type TrocaDetalhe,
} from "@/modules/trocas/troca-queries";
import {
  pdvSearchVariacoes,
  pdvResolverEan,
  type PdvSearchRow,
} from "@/modules/vendas/pdv-actions";
import {
  ReceberPagamentoForm,
  type ReceberPagamentoFormRef,
} from "@/modules/vendas/components/receber-pagamento-form";
import { TrocaEstadoBadge } from "@/modules/trocas/components/troca-estado-badge";
import { ClienteNovoDialog } from "@/modules/clientes/components/cliente-novo-dialog";

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

function moneyFromInput(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function cartTotal(lines: CartLine[]): number {
  return lines.reduce((acc, L) => acc + moneyFromInput(L.precoUnitario) * L.quantidade, 0);
}

const panelClass =
  "rounded-xl border border-border bg-card shadow-xs ring-1 ring-foreground/5";
const panelMutedClass =
  "rounded-xl border border-border bg-muted/25 shadow-xs ring-1 ring-foreground/5";

export type TrocaPdvProps = {
  storeId: string;
  defaultColaboradorId: string;
  defaultClienteId?: string;
  clientes: ClienteOption[];
  vendedores: SelectOption[];
};

export function TrocaPdv(props: TrocaPdvProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("pdv") === "1";
  const viewTrocaId = searchParams.get("view") ?? undefined;

  const close = React.useCallback(() => {
    router.replace("/trocas", { scroll: false });
  }, [router]);

  return <TrocaPdvInner {...props} open={open} viewTrocaId={viewTrocaId} onClose={close} />;
}

// ─── Componente de busca de produto reutilizável ───────────────────────────

type ProdutoBuscaProps = {
  storeId: string;
  disabled: boolean;
  onAdd: (row: PdvSearchRow) => void;
};

function ProdutoBusca({ storeId, disabled, onAdd }: ProdutoBuscaProps) {
  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [hits, setHits] = React.useState<PdvSearchRow[]>([]);
  const [listaAberta, setListaAberta] = React.useState(false);
  const buscaRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!listaAberta) return;
    const fn = (e: MouseEvent) => {
      if (buscaRef.current && !buscaRef.current.contains(e.target as Node))
        setListaAberta(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [listaAberta]);

  async function buscar(query: string) {
    setSearching(true);
    try {
      const r = await pdvSearchVariacoes({ storeId, query: query.trim(), pageSize: 12 });
      if ("error" in r) { toast.error(r.error); return; }
      setHits(r.rows);
      setListaAberta(true);
    } finally {
      setSearching(false);
    }
  }

  async function resolverEan(raw: string): Promise<boolean> {
    const r = await pdvResolverEan({ storeId, eanRaw: raw });
    if ("error" in r) { toast.error(r.error); return false; }
    if (!r.found) { toast.error("EAN não encontrado."); return false; }
    onAdd(r.row);
    return true;
  }

  return (
    <div ref={buscaRef} className="relative space-y-1">
      <div className="relative z-40 flex flex-wrap items-center gap-2">
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
              if (e.key === "Escape") { e.preventDefault(); setListaAberta(false); }
              if (e.key === "Enter") {
                e.preventDefault();
                const raw = q.trim();
                if (raw && /^\d{8,14}$/.test(raw)) {
                  void resolverEan(raw).then((found) => { if (found) setQ(""); });
                } else {
                  void buscar(raw);
                }
              }
              if (e.key === "Tab") {
                const digits = q.replace(/\D/g, "");
                if (digits.length >= 8 && digits.length <= 14) {
                  e.preventDefault();
                  void resolverEan(q).then((found) => { if (found) setQ(""); });
                }
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="shrink-0 touch-manipulation"
          disabled={searching || disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            inputRef.current?.focus({ preventScroll: true });
            void buscar(q);
          }}
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
      </div>

      {listaAberta && (
        <ul className="absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10">
          {searching && hits.length === 0 && (
            <li className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" />A carregar…
            </li>
          )}
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onAdd(h); setListaAberta(false); setQ(""); }}
              >
                <span className="font-medium">{h.produtoNome} — {h.nome}</span>
                <span className="text-xs text-muted-foreground">
                  Saldo: {h.saldo}{h.ean13 ? ` · ${h.ean13}` : ""}
                </span>
              </button>
            </li>
          ))}
          {!searching && hits.length === 0 && (
            <li className="px-3 py-2 text-muted-foreground">Nenhum produto encontrado.</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Tabela de carrinho reutilizável ──────────────────────────────────────

type CarrinhoTableProps = {
  lines: CartLine[];
  setLines: React.Dispatch<React.SetStateAction<CartLine[]>>;
  disabled: boolean;
  emptyText: string;
  totalLabel: string;
  totalClass?: string;
};

function CarrinhoTable({ lines, setLines, disabled, emptyText, totalLabel, totalClass }: CarrinhoTableProps) {
  const total = cartTotal(lines);
  return (
    <>
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[360px] text-xs sm:text-sm">
            <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="px-2 py-1.5 font-medium sm:px-3">Produto</th>
                <th className="px-2 py-1.5 font-medium sm:px-3">Qtd</th>
                <th className="px-2 py-1.5 text-right font-medium sm:px-3">Valor un.</th>
                <th className="px-2 py-1.5 text-right font-medium sm:px-3">Subtotal</th>
                <th className="w-10 px-1 sm:px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((L) => {
                const sub = moneyFromInput(L.precoUnitario) * L.quantidade;
                return (
                  <tr key={L.key} className="bg-card">
                    <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                      <span className="font-medium">{L.label}</span>
                    </td>
                    <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="icon"
                          className="h-9 min-h-9 w-9 min-w-9 shrink-0 touch-manipulation" disabled={disabled}
                          onClick={() => setLines((p) => p.map((x) => x.key === L.key ? { ...x, quantidade: Math.max(1, x.quantidade - 1) } : x))}
                        ><Minus className="size-4" /></Button>
                        <span className="min-w-[2ch] text-center tabular-nums">{L.quantidade}</span>
                        <Button type="button" variant="outline" size="icon"
                          className="h-9 min-h-9 w-9 min-w-9 shrink-0 touch-manipulation" disabled={disabled}
                          onClick={() => setLines((p) => p.map((x) => x.key === L.key ? { ...x, quantidade: x.quantidade + 1 } : x))}
                        ><Plus className="size-4" /></Button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right align-middle sm:px-3 sm:py-2">
                      <Input
                        className="ml-auto h-8 max-w-[6.5rem] font-mono text-xs tabular-nums"
                        inputMode="decimal" value={L.precoUnitario} disabled={disabled}
                        onChange={(e) => setLines((p) => p.map((x) => x.key === L.key ? { ...x, precoUnitario: e.target.value } : x))}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right align-middle tabular-nums sm:px-3 sm:py-2">
                      {BRL.format(sub)}
                    </td>
                    <td className="px-1 py-1.5 text-right align-middle sm:px-2 sm:py-2">
                      <Button type="button" variant="ghost" size="icon"
                        className="h-9 min-h-9 w-9 min-w-9 text-destructive hover:text-destructive" disabled={disabled}
                        onClick={() => setLines((p) => p.filter((x) => x.key !== L.key))}
                      ><Trash2 className="size-4" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-baseline justify-end gap-2 border-t border-border pt-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{totalLabel}</span>
        <span className={cn("text-lg font-semibold tabular-nums tracking-tight", totalClass ?? "")}>
          {BRL.format(total)}
        </span>
      </div>
    </>
  );
}

// ─── Inner ────────────────────────────────────────────────────────────────

function addOrIncrement(prev: CartLine[], row: PdvSearchRow): CartLine[] {
  const ex = prev.find((p) => p.produtoVariacaoId === row.id);
  if (ex) return prev.map((p) => p.produtoVariacaoId === row.id ? { ...p, quantidade: p.quantidade + 1 } : p);
  return [...prev, {
    key: clientRandomId(),
    produtoVariacaoId: row.id,
    label: `${row.produtoNome} — ${row.nome}`,
    quantidade: 1,
    precoUnitario: row.precoSugerido ?? "0",
    saldoRef: row.saldo,
  }];
}

function TrocaPdvInner({
  storeId,
  defaultColaboradorId,
  defaultClienteId = "",
  clientes,
  vendedores,
  open,
  viewTrocaId,
  onClose,
}: TrocaPdvProps & { open: boolean; viewTrocaId?: string; onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = React.useState(false);
  const [trocaStep, setTrocaStep] = React.useState<"devolvidos" | "novos" | "pagamento">("devolvidos");
  const [confirmarResult, setConfirmarResult] = React.useState<{
    trocaId: string;
    pedidoId: string;
    totalNovos: number;
    creditoAplicado: number;
  } | null>(null);
  const pagamentoRef = React.useRef<ReceberPagamentoFormRef>(null);
  const [canSubmitPagamento, setCanSubmitPagamento] = React.useState(false);
  const [pagamentoSubmitting, setPagamentoSubmitting] = React.useState(false);

  // Campos comuns
  const [clienteId, setClienteId] = React.useState<string>(defaultClienteId);
  const [clienteQuery, setClienteQuery] = React.useState(() => clientes.find((c) => c.id === defaultClienteId)?.name ?? "");
  const [clienteListaAberta, setClienteListaAberta] = React.useState(false);
  const [creditoAcumulado, setCreditoAcumulado] = React.useState(() => clientes.find((c) => c.id === defaultClienteId)?.creditoTroca ?? 0);
  const [extraClientes, setExtraClientes] = React.useState<ClienteOption[]>([]);
  const clienteCampoRef = React.useRef<HTMLDivElement>(null);

  const clienteRedirectAfterSave = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("pdv", "1");
    return `/trocas?${p.toString()}`;
  }, [searchParams]);
  const [vendedorId, setVendedorId] = React.useState(() =>
    vendedores.some((v) => v.id === defaultColaboradorId) ? defaultColaboradorId : (vendedores[0]?.id ?? ""),
  );
  const [observacoes, setObservacoes] = React.useState("");

  // Carrinhos
  const [devolvidos, setDevolvidos] = React.useState<CartLine[]>([]);
  const [novos, setNovos] = React.useState<CartLine[]>([]);

  // View mode
  const [viewDetalhe, setViewDetalhe] = React.useState<TrocaDetalhe | null>(null);
  const [viewLoading, setViewLoading] = React.useState(false);
  const hydratedViewRef = React.useRef<string | null>(null);

  const resetState = React.useCallback(() => {
    setClienteId(defaultClienteId);
    setClienteQuery(clientes.find((c) => c.id === defaultClienteId)?.name ?? "");
    setCreditoAcumulado(clientes.find((c) => c.id === defaultClienteId)?.creditoTroca ?? 0);
    setClienteListaAberta(false);
    setExtraClientes([]);
    setVendedorId(vendedores.some((v) => v.id === defaultColaboradorId) ? defaultColaboradorId : (vendedores[0]?.id ?? ""));
    setObservacoes("");
    setDevolvidos([]);
    setNovos([]);
    setTrocaStep("devolvidos");
    setConfirmarResult(null);
    setCanSubmitPagamento(false);
    setPagamentoSubmitting(false);
    setViewDetalhe(null);
    setViewLoading(false);
  }, [clientes, defaultClienteId, defaultColaboradorId, vendedores]);

  React.useEffect(() => {
    if (!open) { resetState(); hydratedViewRef.current = null; }
  }, [open, resetState]);

  // Carrega troca no modo view
  React.useEffect(() => {
    if (!open || !viewTrocaId) { hydratedViewRef.current = null; setViewDetalhe(null); setViewLoading(false); return; }
    if (hydratedViewRef.current === viewTrocaId) return;
    let cancelled = false;
    setViewLoading(true);
    setViewDetalhe(null);
    void (async () => {
      const r = await getTrocaDetalhe({ storeId, trocaId: viewTrocaId });
      if (cancelled) return;
      if ("error" in r) { toast.error(r.error); setViewLoading(false); return; }
      setViewDetalhe(r.data);
      hydratedViewRef.current = viewTrocaId;
      setViewLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, viewTrocaId, storeId]);

  // Fecha dropdown cliente
  React.useEffect(() => {
    if (!clienteListaAberta) return;
    const fn = (e: MouseEvent) => {
      if (clienteCampoRef.current && !clienteCampoRef.current.contains(e.target as Node)) setClienteListaAberta(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [clienteListaAberta]);

  // Captura retorno do cadastro de cliente (?novoCliente=<id>&novoClienteNome=<name>)
  const aplicouNovoClienteRef = React.useRef("");
  React.useEffect(() => {
    const nid = searchParams.get("novoCliente");
    const nNom = searchParams.get("novoClienteNome");
    if (!nid) { aplicouNovoClienteRef.current = ""; return; }
    const dedupe = `${nid}|${nNom ?? ""}`;
    if (aplicouNovoClienteRef.current === dedupe) return;
    aplicouNovoClienteRef.current = dedupe;

    const p = new URLSearchParams(searchParams.toString());
    p.delete("novoCliente");
    p.delete("novoClienteNome");
    const qs = p.toString();
    router.replace(qs ? `/trocas?${qs}` : "/trocas", { scroll: false });

    const label = nNom?.trim() || "Cliente";
    setClienteId(nid);
    setClienteQuery(label);
    setClienteListaAberta(false);
    const fromList = clientes.find((c) => c.id === nid);
    if (!fromList) {
      setExtraClientes((prev) => [
        ...prev.filter((p) => p.id !== nid),
        { id: nid, name: label, creditoTroca: 0 },
      ]);
    } else {
      setCreditoAcumulado(fromList.creditoTroca);
    }
    toast.success("Cliente selecionado.");
  }, [searchParams, clientes, router]);

  const clientesFiltrados = React.useMemo(() => {
    const term = clienteQuery.trim().toLowerCase();
    const all = [
      ...clientes.map((c) => ({ id: c.id, label: c.name, creditoTroca: c.creditoTroca })),
      ...extraClientes
        .filter((e) => !clientes.some((c) => c.id === e.id))
        .map((e) => ({ id: e.id, label: e.name, creditoTroca: e.creditoTroca })),
    ];
    if (!term) return all.slice(0, 50);
    return all.filter((r) => r.label.toLowerCase().includes(term)).slice(0, 50);
  }, [clientes, extraClientes, clienteQuery]);

  function avancarParaNovos() {
    if (!clienteId.trim()) { toast.error("Selecione um cliente."); return; }
    if (!vendedorId.trim()) { toast.error("Selecione um vendedor."); return; }
    if (devolvidos.length === 0) { toast.error("Adicione ao menos um item devolvido."); return; }
    setTrocaStep("novos");
  }

  async function confirmar() {
    if (!clienteId.trim()) { toast.error("Selecione um cliente."); return; }
    if (devolvidos.length === 0) { toast.error("Adicione ao menos um item devolvido."); return; }

    setBusy(true);
    let trocaId: string | null = null;
    try {
      const draft = await trocaCreateDraft({ storeId, clienteId, vendedorId });
      if ("error" in draft) { toast.error(draft.error); return; }
      trocaId = draft.trocaId;

      const saveR = await trocaSaveItensDevolvidos({
        storeId, trocaId,
        itens: devolvidos.map((L) => ({ produtoVariacaoId: L.produtoVariacaoId, quantidade: L.quantidade, valorUnitario: L.precoUnitario })),
      });
      if ("error" in saveR) { await trocaCancelar({ storeId, trocaId }); toast.error(saveR.error); return; }

      const r = await trocaConfirmar({
        storeId, trocaId,
        itensNovos: novos.map((L) => ({ produtoVariacaoId: L.produtoVariacaoId, quantidade: L.quantidade, precoUnitario: L.precoUnitario })),
        observacoes: observacoes || undefined,
      });
      if ("error" in r) { await trocaCancelar({ storeId, trocaId }); toast.error(r.error); return; }

      // Se há saldo a pagar e um pedido gerado, vai para o passo de pagamento
      if (r.saldoDevedor > 0.004 && r.pedidoId) {
        setConfirmarResult({
          trocaId,
          pedidoId: r.pedidoId,
          totalNovos: totalNovos,
          creditoAplicado: totalNovos - r.saldoDevedor,
        });
        setTrocaStep("pagamento");
      } else {
        router.replace(`/trocas?pdv=1&view=${trocaId}`, { scroll: false });
      }
    } finally {
      setBusy(false);
    }
  }

  const creditoGerado = cartTotal(devolvidos);
  const totalNovos = cartTotal(novos);
  const saldoDevedor = Math.max(0, totalNovos - creditoGerado);
  const creditoRemanescente = Math.max(0, creditoGerado - totalNovos);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={cn(
        "top-1/2 left-1/2 flex h-[min(80vh,calc(100dvh-2rem))] max-h-[min(80vh,calc(100dvh-2rem))]",
        "w-[min(80vw,calc(100vw-2rem))] max-w-[min(80vw,calc(100vw-2rem))]",
        "-translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden p-0",
      )}>

        {/* ── Modo view ── */}
        {viewTrocaId ? (
          viewLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <span className="text-sm">A carregar troca…</span>
            </div>
          ) : viewDetalhe ? (
            <>
              <div className="shrink-0 border-b px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <DialogHeader className="text-left sm:min-w-0 sm:flex-1">
                    <DialogTitle>Troca nº {viewDetalhe.numero}</DialogTitle>
                    <DialogDescription>{formatDateBr(viewDetalhe.createdAt)}</DialogDescription>
                  </DialogHeader>
                  <TrocaEstadoBadge estado={viewDetalhe.estado} />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  <div className="order-1 flex flex-col gap-4">
                    <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Itens devolvidos</p>
                      {viewDetalhe.itensDevolvidos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum item.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-border bg-card">
                          <table className="w-full min-w-[300px] text-xs sm:text-sm">
                            <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
                              <tr>
                                <th className="px-2 py-1.5 font-medium sm:px-3">Produto</th>
                                <th className="px-2 py-1.5 font-medium sm:px-3">Qtd</th>
                                <th className="px-2 py-1.5 text-right font-medium sm:px-3">Valor un.</th>
                                <th className="px-2 py-1.5 text-right font-medium sm:px-3">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {viewDetalhe.itensDevolvidos.map((it) => (
                                <tr key={it.id} className="bg-card">
                                  <td className="px-2 py-2 align-middle sm:px-3"><span className="font-medium">{it.label}</span></td>
                                  <td className="px-2 py-2 tabular-nums sm:px-3">{it.quantidade}</td>
                                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">{BRL.format(it.valorUnitario)}</td>
                                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">{BRL.format(it.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="flex items-baseline justify-end gap-2 border-t border-border pt-3">
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Crédito gerado</span>
                        <span className="text-lg font-semibold tabular-nums text-emerald-600">{BRL.format(viewDetalhe.creditoGerado)}</span>
                      </div>
                    </section>

                    {viewDetalhe.itensNovos.length > 0 && (
                      <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Itens levados</p>
                        <div className="overflow-x-auto rounded-lg border border-border bg-card">
                          <table className="w-full min-w-[300px] text-xs sm:text-sm">
                            <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
                              <tr>
                                <th className="px-2 py-1.5 font-medium sm:px-3">Produto</th>
                                <th className="px-2 py-1.5 font-medium sm:px-3">Qtd</th>
                                <th className="px-2 py-1.5 text-right font-medium sm:px-3">Valor un.</th>
                                <th className="px-2 py-1.5 text-right font-medium sm:px-3">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {viewDetalhe.itensNovos.map((it) => (
                                <tr key={it.id} className="bg-card">
                                  <td className="px-2 py-2 align-middle sm:px-3"><span className="font-medium">{it.label}</span></td>
                                  <td className="px-2 py-2 tabular-nums sm:px-3">{it.quantidade}</td>
                                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">{BRL.format(it.valorUnitario)}</td>
                                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">{BRL.format(it.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-baseline justify-end gap-2 border-t border-border pt-3">
                          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Total levado</span>
                          <span className="text-lg font-semibold tabular-nums">
                            {BRL.format(viewDetalhe.itensNovos.reduce((s, it) => s + it.subtotal, 0))}
                          </span>
                        </div>
                      </section>
                    )}
                  </div>

                  <div className="order-2 flex flex-col gap-4">
                    <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Detalhes</p>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Cliente</dt>
                          <dd className="font-medium">{viewDetalhe.clienteNome}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Vendedor</dt>
                          <dd className="font-medium">{viewDetalhe.vendedorNome}</dd>
                        </div>
                      </dl>
                    </section>
                    <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Crédito</p>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Gerado</dt>
                          <dd className="font-semibold tabular-nums text-emerald-600">{BRL.format(viewDetalhe.creditoGerado)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Consumido</dt>
                          <dd className="tabular-nums">{BRL.format(viewDetalhe.creditoConsumido)}</dd>
                        </div>
                        <div className="flex justify-between gap-2 border-t border-border pt-2">
                          <dt className="font-medium">Remanescente</dt>
                          <dd className={cn("font-semibold tabular-nums", viewDetalhe.creditoRemanescente > 0.004 ? "text-sky-600" : "text-muted-foreground")}>
                            {viewDetalhe.creditoRemanescente > 0.004 ? BRL.format(viewDetalhe.creditoRemanescente) : "—"}
                          </dd>
                        </div>
                      </dl>
                    </section>
                    {viewDetalhe.observacoes && (
                      <section className={cn("space-y-2 p-3 sm:p-4", panelClass)}>
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Observações</p>
                        <p className="text-sm">{viewDetalhe.observacoes}</p>
                      </section>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-muted/30 px-4 py-3 sm:px-5 sm:py-3.5">
                <div className="flex w-full justify-end">
                  <Button type="button" onClick={onClose} className="min-h-10 touch-manipulation">Fechar</Button>
                </div>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-destructive">Não foi possível carregar a troca.</p>
              <Button variant="outline" className="mt-4" onClick={onClose}>Fechar</Button>
            </div>
          )
        ) : (
          /* ── Modo nova troca (3 steps) ── */
          <>
            <div className="shrink-0 border-b px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <DialogHeader className="text-left">
                  <DialogTitle>Nova troca (PDV)</DialogTitle>
                  <DialogDescription>
                    {trocaStep === "devolvidos"
                      ? "Leia os itens que o cliente devolve e selecione o cliente."
                      : trocaStep === "novos"
                        ? "Selecione os novos itens que o cliente vai levar."
                        : "Registe o pagamento da diferença."}
                  </DialogDescription>
                </DialogHeader>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
                  {trocaStep === "devolvidos" ? "1/2" : trocaStep === "novos" ? "2/2" : "Pgto"}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {trocaStep === "devolvidos" ? (
                /* Step 1 */
                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  {/* Esquerda: devolvidos */}
                  <div className="order-1 flex flex-col gap-4">
                    <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Itens devolvidos</p>
                      <ProdutoBusca
                        storeId={storeId}
                        disabled={busy}
                        onAdd={(row) => {
                          setDevolvidos((prev) => addOrIncrement(prev, row));
                          if (row.saldo <= 0) toast.message("Atenção: saldo zero nesta loja para este SKU.");
                        }}
                      />
                    </section>
                    <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Carrinho e crédito</p>
                      <CarrinhoTable
                        lines={devolvidos} setLines={setDevolvidos} disabled={busy}
                        emptyText="Nenhum item. Escreva no campo acima ou leia um código de barras."
                        totalLabel="Crédito a gerar" totalClass="text-emerald-600"
                      />
                    </section>
                  </div>

                  {/* Direita: cliente + vendedor */}
                  <div className="order-2 flex flex-col gap-4">
                    <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Cliente</p>
                      <div className="space-y-1.5">
                        <Label htmlFor="troca-cliente">Cliente</Label>
                        <div ref={clienteCampoRef} className="relative space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="troca-cliente" autoComplete="off" placeholder="Buscar cliente…"
                              value={clienteQuery} disabled={busy}
                              className="min-w-0 flex-1"
                              onChange={(e) => { setClienteQuery(e.target.value); setClienteId(""); setCreditoAcumulado(0); setClienteListaAberta(true); }}
                              onFocus={() => setClienteListaAberta(true)}
                              onKeyDown={(e) => { if (e.key === "Escape") setClienteListaAberta(false); }}
                            />
                            <ClienteNovoDialog
                              storeId={storeId}
                              corretores={[]}
                              trigger="icon"
                              redirectAfterSave={clienteRedirectAfterSave}
                              disabled={busy}
                            />
                          </div>
                          {clienteListaAberta && clientesFiltrados.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 z-30 mt-1 max-h-52 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10">
                              {clientesFiltrados.map((row) => (
                                <li key={row.id}>
                                  <button type="button" className="flex w-full px-3 py-2 text-left hover:bg-muted/60"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setClienteId(row.id); setClienteQuery(row.label); setCreditoAcumulado(row.creditoTroca); setClienteListaAberta(false); }}
                                  >
                                    <span className="flex-1">{row.label}</span>
                                    {row.creditoTroca > 0.004 && (
                                      <span className="ml-2 text-xs text-emerald-600">crédito {BRL.format(row.creditoTroca)}</span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {clientesFiltrados.length === 0 && clienteQuery.trim().length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Sem resultados — usa o botão ao lado{" "}
                              <span className="whitespace-nowrap">(ícone +)</span> para cadastrar.
                            </p>
                          )}
                        </div>
                        {creditoAcumulado > 0.004 && (
                          <p className="text-[11px] text-emerald-600">Crédito atual: {BRL.format(creditoAcumulado)}</p>
                        )}
                      </div>
                    </section>

                    <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Equipa de troca</p>
                      <div className="space-y-1.5">
                        <Label htmlFor="troca-vendedor">Vendedor</Label>
                        <select id="troca-vendedor"
                          className="flex h-10 min-h-10 w-full rounded-md border border-input bg-transparent ps-3 pe-10 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          value={vendedorId} disabled={busy} onChange={(e) => setVendedorId(e.target.value)}
                        >
                          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="troca-observacoes">Observações</Label>
                        <textarea id="troca-observacoes" rows={3} value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)} disabled={busy}
                          placeholder="Notas sobre a troca (opcional)"
                          className={cn(
                            "min-h-[4.5rem] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                            "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                          )}
                        />
                      </div>
                    </section>
                  </div>
                </div>
              ) : trocaStep === "novos" ? (
                /* Step 2 */
                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  {/* Esquerda: novos */}
                  <div className="order-1 flex flex-col gap-4">
                    <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Novos itens</p>
                      <ProdutoBusca
                        storeId={storeId}
                        disabled={busy}
                        onAdd={(row) => {
                          setNovos((prev) => addOrIncrement(prev, row));
                          if (row.saldo <= 0) toast.message("Atenção: saldo zero nesta loja para este SKU.");
                        }}
                      />
                    </section>
                    <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Carrinho</p>
                      <CarrinhoTable
                        lines={novos} setLines={setNovos} disabled={busy}
                        emptyText="Nenhum item novo. O crédito ficará na conta do cliente."
                        totalLabel="Total novos"
                      />
                    </section>
                  </div>

                  {/* Direita: resumo */}
                  <div className="order-2 flex flex-col gap-4">
                    <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Resumo</p>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Crédito gerado</dt>
                          <dd className="font-semibold tabular-nums text-emerald-600">{BRL.format(creditoGerado)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Total novos</dt>
                          <dd className="tabular-nums">{BRL.format(totalNovos)}</dd>
                        </div>
                        <div className="flex justify-between gap-2 border-t border-border pt-2">
                          {saldoDevedor > 0.004 ? (
                            <>
                              <dt className="font-medium">Saldo a pagar</dt>
                              <dd className="font-semibold tabular-nums text-amber-600">{BRL.format(saldoDevedor)}</dd>
                            </>
                          ) : creditoRemanescente > 0.004 ? (
                            <>
                              <dt className="font-medium">Crédito remanescente</dt>
                              <dd className="font-semibold tabular-nums text-sky-600">{BRL.format(creditoRemanescente)}</dd>
                            </>
                          ) : (
                            <>
                              <dt className="font-medium">Saldo</dt>
                              <dd className="font-semibold text-emerald-600">Quitado</dd>
                            </>
                          )}
                        </div>
                      </dl>
                      {saldoDevedor > 0.004 && (
                        <p className="text-[11px] text-muted-foreground">
                          O cliente precisará pagar {BRL.format(saldoDevedor)} adicionalmente.
                        </p>
                      )}
                      {creditoRemanescente > 0.004 && (
                        <p className="text-[11px] text-muted-foreground">
                          O crédito remanescente de {BRL.format(creditoRemanescente)} ficará na conta do cliente.
                        </p>
                      )}
                    </section>

                    <section className={cn("space-y-2 p-3 sm:p-4", panelClass)}>
                      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Cliente</p>
                      <p className="text-sm font-medium">{clienteQuery || "—"}</p>
                    </section>
                  </div>
                </div>
              ) : confirmarResult ? (
                /* Step 3 — Pagamento */
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs ring-1 ring-foreground/5">
                  <ReceberPagamentoForm
                    ref={pagamentoRef}
                    storeId={storeId}
                    pedidoId={confirmarResult.pedidoId}
                    totalPedido={confirmarResult.totalNovos}
                    totalJaPago={confirmarResult.creditoAplicado}
                    disabled={busy}
                    resetKey={confirmarResult.pedidoId}
                    onCanSubmitChange={setCanSubmitPagamento}
                    onSubmittingChange={setPagamentoSubmitting}
                    onSuccess={() => {
                      router.replace(`/trocas?pdv=1&view=${confirmarResult.trocaId}`, { scroll: false });
                    }}
                  />
                </div>
              ) : null}
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-muted/30 px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                {trocaStep === "devolvidos" ? (
                  <>
                    <Button type="button" variant="ghost"
                      className="min-h-10 justify-start text-destructive hover:text-destructive touch-manipulation"
                      onClick={onClose} disabled={busy}
                    >Cancelar</Button>
                    <Button type="button" className="min-h-10 min-w-40 touch-manipulation"
                      onClick={avancarParaNovos} disabled={busy}
                    >Próximo →</Button>
                  </>
                ) : trocaStep === "novos" ? (
                  <>
                    <Button type="button" variant="ghost"
                      className="min-h-10 justify-start touch-manipulation"
                      onClick={() => setTrocaStep("devolvidos")} disabled={busy}
                    >← Voltar</Button>
                    <Button type="button" className="min-h-10 min-w-40 touch-manipulation"
                      onClick={confirmar} disabled={busy}
                    >
                      {busy ? <><Loader2 className="mr-2 size-4 animate-spin" />Confirmando…</> : "Confirmar troca"}
                    </Button>
                  </>
                ) : (
                  /* pagamento */
                  <>
                    <Button type="button" variant="outline"
                      className="min-h-10 touch-manipulation"
                      onClick={onClose} disabled={pagamentoSubmitting}
                    >Fechar (cobrar depois)</Button>
                    <Button type="button" className="min-h-10 min-w-40 touch-manipulation"
                      disabled={pagamentoSubmitting || !canSubmitPagamento}
                      onClick={() => pagamentoRef.current?.submit()}
                    >
                      {pagamentoSubmitting ? <><Loader2 className="mr-2 size-4 animate-spin" />Registando…</> : "Confirmar pagamento"}
                    </Button>
                  </>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
