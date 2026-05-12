"use client";

/**
 * PDV de troca em 2 etapas (`/trocas?pdv=1`):
 * 1 — Artigos que o cliente quer trocar (devolução / crédito).
 * 2 — Como o PDV: novos artigos + cliente + equipa, com crédito da etapa 1 em conta.
 */
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Minus, Plus, Search, Trash2 } from "lucide-react";
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
import { ClienteNovoDialog } from "@/modules/clientes/components/cliente-novo-dialog";
import { parseBRL } from "@/lib/form-utils";
import { cn } from "@/lib/utils";
import { registrarTroca } from "@/modules/trocas/trocas-actions";
import { buildTrocasHref } from "@/modules/trocas/lib/build-href";
import {
  pdvResolverEan,
  pdvSearchVariacoes,
  type PdvSearchRow,
} from "@/modules/vendas/pdv-actions";

type SelectOption = { id: string; name: string };

type LinhaTrocaDraft = {
  key: string;
  produtoVariacaoId: string;
  label: string;
  quantidade: number;
  valorUnitario: string;
};

const panelClass =
  "rounded-xl border border-border bg-card shadow-xs ring-1 ring-foreground/5";
const panelMutedClass =
  "rounded-xl border border-border bg-muted/25 shadow-xs ring-1 ring-foreground/5";

export type TrocasPdvProps = {
  storeId: string;
  defaultColaboradorId: string;
  clientes: SelectOption[];
  vendedores: SelectOption[];
};

function moneyFmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPrecoPtBr(s: string | null): string {
  if (s == null || s === "") return "";
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function cartCredito(lines: LinhaTrocaDraft[]): number {
  let t = 0;
  for (const L of lines) {
    const vu = parseBRL(L.valorUnitario);
    if (!Number.isFinite(vu) || vu < 0) continue;
    t += vu * L.quantidade;
  }
  return t;
}

function StepIndicator({ etapa }: { etapa: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-3 pb-2">
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
          etapa === 1
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        1
      </div>
      <div className="h-px w-10 bg-border" aria-hidden />
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
          etapa === 2
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        2
      </div>
      <span className="sr-only">
        Etapa {etapa} de 2
      </span>
    </div>
  );
}

function LinhasTable({
  lines,
  setLines,
  busy,
  listaVaziaTexto,
}: {
  lines: LinhaTrocaDraft[];
  setLines: React.Dispatch<React.SetStateAction<LinhaTrocaDraft[]>>;
  busy: boolean;
  listaVaziaTexto: string;
}) {
  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        {listaVaziaTexto}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[260px] text-xs sm:text-sm">
        <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
          <tr>
            <th className="px-2 py-1.5 font-medium sm:px-3">Artigo</th>
            <th className="px-2 py-1.5 font-medium sm:px-3">Qtd</th>
            <th className="px-2 py-1.5 text-right font-medium sm:px-3">
              Valor un.
            </th>
            <th className="px-2 py-1.5 text-right font-medium sm:px-3">
              Subtotal
            </th>
            <th className="w-10 px-1 sm:px-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((L) => {
            const vu = parseBRL(L.valorUnitario);
            const sub =
              Number.isFinite(vu) && vu >= 0 ? vu * L.quantidade : 0;
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
                      className="h-9 min-h-9 w-9 min-w-9 shrink-0 touch-manipulation"
                      disabled={busy}
                      onClick={() =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.key === L.key
                              ? {
                                  ...x,
                                  quantidade: Math.max(1, x.quantidade - 1),
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="min-w-[2ch] text-center tabular-nums">
                      {L.quantidade}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 min-h-9 w-9 min-w-9 shrink-0 touch-manipulation"
                      disabled={busy}
                      onClick={() =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.key === L.key
                              ? { ...x, quantidade: x.quantidade + 1 }
                              : x,
                          ),
                        )
                      }
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right align-middle sm:px-3 sm:py-2">
                  <Input
                    className="ml-auto h-8 max-w-[6.5rem] font-mono text-xs tabular-nums"
                    inputMode="decimal"
                    value={L.valorUnitario}
                    disabled={busy}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLines((prev) =>
                        prev.map((x) =>
                          x.key === L.key ? { ...x, valorUnitario: v } : x,
                        ),
                      );
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 text-right align-middle tabular-nums sm:px-3 sm:py-2">
                  {moneyFmt(sub)}
                </td>
                <td className="px-1 py-1.5 text-right align-middle sm:px-2 sm:py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 min-h-9 w-9 min-w-9 text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() =>
                      setLines((prev) => prev.filter((x) => x.key !== L.key))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Busca + lista (reutilizado na etapa 1 e na etapa 2). */
function TrocaColunaBuscaLista({
  storeId,
  busy,
  open,
  lines,
  setLines,
  tituloLista,
  listaVaziaTexto,
  toastAdicionado,
  buscaTitulo = "Buscar / código de barras",
}: {
  storeId: string;
  busy: boolean;
  open: boolean;
  lines: LinhaTrocaDraft[];
  setLines: React.Dispatch<React.SetStateAction<LinhaTrocaDraft[]>>;
  tituloLista: string;
  listaVaziaTexto: string;
  toastAdicionado: string;
  buscaTitulo?: string;
}) {
  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [hits, setHits] = React.useState<PdvSearchRow[]>([]);
  const [listaAberta, setListaAberta] = React.useState(false);
  const produtoQInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setListaAberta(false);
    }
  }, [open]);

  React.useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const r = await pdvSearchVariacoes({
            storeId,
            query: t,
            skip: 0,
            pageSize: 24,
          });
          if ("error" in r) {
            setHits([]);
            return;
          }
          setHits(r.rows);
          setListaAberta(true);
        } finally {
          setSearching(false);
        }
      })();
    }, 400);
    return () => window.clearTimeout(id);
  }, [q, storeId]);

  const pushLine = React.useCallback(
    (row: PdvSearchRow) => {
      const vu = formatPrecoPtBr(row.precoSugerido) || "0,00";
      setLines((prev) => {
        const existing = prev.find((p) => p.produtoVariacaoId === row.id);
        if (existing) {
          return prev.map((p) =>
            p.produtoVariacaoId === row.id
              ? { ...p, quantidade: p.quantidade + 1 }
              : p,
          );
        }
        return [
          ...prev,
          {
            key: crypto.randomUUID(),
            produtoVariacaoId: row.id,
            label: `${row.produtoNome} — ${row.nome}`,
            quantidade: 1,
            valorUnitario: vu,
          },
        ];
      });
      toast.success(toastAdicionado);
    },
    [setLines, toastAdicionado],
  );

  const runBuscaProduto = React.useCallback(async () => {
    const raw = q.trim();
    if (raw && /^\d{8,14}$/.test(raw)) {
      const r = await pdvResolverEan({ storeId, eanRaw: raw });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      if (r.found) {
        pushLine(r.row);
        setQ("");
        setListaAberta(false);
        requestAnimationFrame(() =>
          produtoQInputRef.current?.focus({ preventScroll: true }),
        );
        return;
      }
    }
    setListaAberta(true);
    setSearching(true);
    try {
      const r = await pdvSearchVariacoes({
        storeId,
        query: raw,
        skip: 0,
        pageSize: 24,
      });
      if ("error" in r) {
        toast.error(r.error);
        setHits([]);
        return;
      }
      setHits(r.rows);
    } finally {
      setSearching(false);
    }
    requestAnimationFrame(() =>
      produtoQInputRef.current?.focus({ preventScroll: true }),
    );
  }, [q, storeId, pushLine]);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {buscaTitulo}
        </p>
        <div className="relative space-y-1">
          <div className="relative z-40 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground" />
              <Input
                ref={produtoQInputRef}
                className="pl-8"
                placeholder="Nome, referência, EAN ou código de barras…"
                value={q}
                autoComplete="off"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setListaAberta(false);
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runBuscaProduto();
                  }
                  if (e.key === "Tab") {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    const digits = v.replace(/\D/g, "");
                    if (digits.length >= 8 && digits.length <= 14) {
                      e.preventDefault();
                      void (async () => {
                        const r = await pdvResolverEan({
                          storeId,
                          eanRaw: v,
                        });
                        if ("error" in r) {
                          toast.error(r.error);
                          return;
                        }
                        if (r.found) {
                          pushLine(r.row);
                          setQ("");
                          setListaAberta(false);
                        }
                      })();
                    }
                  }
                }}
                disabled={busy}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="shrink-0 touch-manipulation"
              aria-label="Buscar"
              title="Buscar"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                produtoQInputRef.current?.focus({ preventScroll: true });
                void runBuscaProduto();
              }}
              disabled={searching || busy}
            >
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
            </Button>
          </div>
          {listaAberta && (
            <ul
              role="listbox"
              className="absolute top-full right-0 left-0 z-30 mt-1 max-h-52 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10"
            >
              {searching && hits.length === 0 && (
                <li className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                  A carregar…
                </li>
              )}
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    role="option"
                    disabled={busy}
                    className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      pushLine(h);
                      setListaAberta(false);
                    }}
                  >
                    <span className="font-medium">
                      {h.produtoNome} — {h.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Saldo loja: {h.saldo}
                      {h.ean13 ? ` · ${h.ean13}` : ""}
                    </span>
                  </button>
                </li>
              ))}
              {q.trim().length >= 2 && !searching && hits.length === 0 && (
                <li className="px-3 py-2 text-muted-foreground">
                  Nenhum produto encontrado.
                </li>
              )}
            </ul>
          )}
        </div>
      </section>

      <section className={cn("min-h-0 flex-1 space-y-3 p-3 sm:p-4", panelMutedClass)}>
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {tituloLista}
        </p>
        <LinhasTable
          lines={lines}
          setLines={setLines}
          busy={busy}
          listaVaziaTexto={listaVaziaTexto}
        />
      </section>
    </div>
  );
}

export function TrocasPdv(props: TrocasPdvProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("pdv") === "1";

  const close = React.useCallback(() => {
    const href = buildTrocasHref(new URLSearchParams(searchParams.toString()), {
      pdv: null,
    });
    router.replace(href, { scroll: false });
  }, [router, searchParams]);

  return <TrocasPdvInner {...props} open={open} onClose={close} />;
}

function validarLinhasDevolucao(lines: LinhaTrocaDraft[]): string | null {
  if (lines.length === 0) {
    return "Adicione pelo menos um artigo que o cliente quer trocar.";
  }
  for (const L of lines) {
    const vu = parseBRL(L.valorUnitario);
    if (!Number.isFinite(vu) || vu <= 0) {
      return `Valor unitário inválido em «${L.label}».`;
    }
    if (!Number.isInteger(L.quantidade) || L.quantidade <= 0) {
      return `Quantidade inválida em «${L.label}».`;
    }
  }
  return null;
}

function TrocasPdvInner({
  storeId,
  defaultColaboradorId,
  clientes,
  vendedores,
  open,
  onClose,
}: TrocasPdvProps & { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [etapa, setEtapa] = React.useState<1 | 2>(1);

  React.useEffect(() => {
    if (!open) setEtapa(1);
  }, [open]);

  const clienteRedirectAfterSave = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("pdv", "1");
    return `/trocas?${p.toString()}`;
  }, [searchParams]);

  const [busy, setBusy] = React.useState(false);

  const [linesDevolucao, setLinesDevolucao] = React.useState<LinhaTrocaDraft[]>(
    [],
  );
  const [linesSubstituicao, setLinesSubstituicao] = React.useState<
    LinhaTrocaDraft[]
  >([]);

  const [clienteId, setClienteId] = React.useState("");
  const [clienteNomeResolvido, setClienteNomeResolvido] = React.useState("");
  const [clienteQuery, setClienteQuery] = React.useState("");
  const [clienteListaAberta, setClienteListaAberta] = React.useState(false);
  const clienteCampoRef = React.useRef<HTMLDivElement>(null);

  const [vendedorId, setVendedorId] = React.useState(() => {
    if (vendedores.some((v) => v.id === defaultColaboradorId)) {
      return defaultColaboradorId;
    }
    return vendedores[0]?.id ?? "";
  });

  const [obs, setObs] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const creditoEtapa1 = React.useMemo(
    () => cartCredito(linesDevolucao),
    [linesDevolucao],
  );
  const totalNovos = React.useMemo(
    () => cartCredito(linesSubstituicao),
    [linesSubstituicao],
  );
  const diferencaPagar = Math.max(0, totalNovos - creditoEtapa1);

  const linhasClienteFiltradas = React.useMemo(() => {
    const qv = clienteQuery.trim().toLowerCase();
    const base = clientes.map((c) => ({
      id: c.id,
      label: c.name,
    }));
    if (qv.length === 0) return base.slice(0, 50);
    return base
      .filter((c) => c.label.toLowerCase().includes(qv))
      .slice(0, 50);
  }, [clienteQuery, clientes]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!clienteCampoRef.current?.contains(e.target as Node)) {
        setClienteListaAberta(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function escolherCliente(id: string, nome: string) {
    setClienteId(id);
    setClienteNomeResolvido(nome);
    setClienteQuery(nome);
    setClienteListaAberta(false);
  }

  function descartar() {
    setEtapa(1);
    setLinesDevolucao([]);
    setLinesSubstituicao([]);
    setClienteId("");
    setClienteNomeResolvido("");
    setClienteQuery("");
    setObs("");
    setError(null);
    setVendedorId(
      vendedores.some((v) => v.id === defaultColaboradorId)
        ? defaultColaboradorId
        : vendedores[0]?.id ?? "",
    );
    onClose();
  }

  function continuarEtapa1() {
    setError(null);
    const err = validarLinhasDevolucao(linesDevolucao);
    if (err) {
      setError(err);
      toast.error(err);
      return;
    }
    setEtapa(2);
  }

  async function confirmar() {
    setError(null);
    const errDev = validarLinhasDevolucao(linesDevolucao);
    if (errDev) {
      setError(errDev);
      return;
    }
    if (!clienteId) {
      setError("Selecione o cliente.");
      return;
    }

    for (const L of linesSubstituicao) {
      const vu = parseBRL(L.valorUnitario);
      if (!Number.isFinite(vu) || vu <= 0) {
        setError(`Valor unitário inválido em «${L.label}» (novos artigos).`);
        return;
      }
      if (!Number.isInteger(L.quantidade) || L.quantidade <= 0) {
        setError(`Quantidade inválida em «${L.label}» (novos artigos).`);
        return;
      }
    }

    setBusy(true);
    try {
      const r = await registrarTroca({
        storeId,
        clienteId,
        obs: obs.trim() || null,
        operadorColaboradorId: vendedorId || null,
        itens: linesDevolucao.map((L) => ({
          produtoVariacaoId: L.produtoVariacaoId,
          quantidade: L.quantidade,
          valorUnitario: L.valorUnitario,
        })),
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      toast.success(`Troca #${r.numero} registada.`);
      if (linesSubstituicao.length > 0) {
        toast.message(
          `Crédito da troca aplicável: ${moneyFmt(creditoEtapa1)} · Total novos artigos: ${moneyFmt(totalNovos)} · Diferença indicativa: ${moneyFmt(diferencaPagar)} — finalize a venda no PDV se ainda precisar de baixar stock dos novos artigos.`,
          { duration: 8000 },
        );
      }
      descartar();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          etapa === 1
            ? "top-1/2 left-1/2 flex h-[min(88vh,calc(100dvh-2rem))] max-h-[min(88vh,calc(100dvh-2rem))] w-[min(92vw,calc(100vw-1rem))] max-w-[min(92vw,calc(100vw-1rem))]"
            : "top-1/2 left-1/2 flex h-[min(92vh,calc(100dvh-2rem))] max-h-[min(92vh,calc(100dvh-2rem))] w-[min(96vw,calc(100vw-0.75rem))] max-w-[min(96vw,calc(100vw-0.75rem))]",
          "-translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden p-0",
          "[&_[data-slot=dialog-close]]:min-h-10 [&_[data-slot=dialog-close]]:min-w-10 [&_[data-slot=dialog-close]]:touch-manipulation",
        )}
      >
        <div className="shrink-0 border-b bg-muted/30 px-4 py-3 sm:px-5">
          <StepIndicator etapa={etapa} />
          <DialogHeader className="text-left">
            <DialogTitle>
              {etapa === 1
                ? "Etapa 1 — O que o cliente quer trocar"
                : "Etapa 2 — Substituição (tipo PDV)"}
            </DialogTitle>
            <DialogDescription>
              {etapa === 1
                ? "Monte a lista de artigos devolvidos. O crédito é calculado com base nos valores abaixo."
                : "Monte o carrinho dos novos artigos. O painel direito mostra o crédito da etapa 1 e a diferença a pagar em relação ao total dos novos artigos."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {etapa === 1 ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <TrocaColunaBuscaLista
                storeId={storeId}
                busy={busy}
                open={open}
                lines={linesDevolucao}
                setLines={setLinesDevolucao}
                tituloLista="Lista de artigos a trocar"
                listaVaziaTexto="Nenhum artigo. Busque ou leia o código acima."
                toastAdicionado="Adicionado à lista de troca."
              />
              <section className={cn("space-y-2 p-4", panelClass)}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Crédito previsto (esta lista)
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {moneyFmt(creditoEtapa1)}
                </p>
              </section>
              {error && etapa === 1 ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <TrocaColunaBuscaLista
                storeId={storeId}
                busy={busy}
                open={open}
                lines={linesSubstituicao}
                setLines={setLinesSubstituicao}
                tituloLista="Carrinho e total"
                listaVaziaTexto="Nenhum item. Busque produtos como no PDV de vendas."
                toastAdicionado="Adicionado ao carrinho."
                buscaTitulo="Produtos"
              />

              <div className="flex flex-col gap-4">
                <section
                  className={cn(
                    "space-y-3 border-primary/30 bg-primary/5 p-3 sm:p-4",
                    panelClass,
                  )}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Crédito da etapa 1 (devolução)
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-primary">
                    {moneyFmt(creditoEtapa1)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Este valor será creditado ao cliente ao confirmar a troca.
                  </p>
                </section>

                <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Comprador
                  </p>
                  <div ref={clienteCampoRef} className="relative space-y-2">
                    <Label htmlFor="troca-pdv-cliente">Cliente</Label>
                    <div className="flex gap-2">
                      <Input
                        id="troca-pdv-cliente"
                        autoComplete="off"
                        placeholder="Buscar cliente ou cadastrar novo…"
                        value={clienteQuery}
                        disabled={busy}
                        onChange={(e) => {
                          setClienteQuery(e.target.value);
                          setClienteId("");
                          setClienteNomeResolvido("");
                          setClienteListaAberta(true);
                        }}
                        onFocus={() => setClienteListaAberta(true)}
                        className="min-w-0 flex-1"
                      />
                      <ClienteNovoDialog
                        storeId={storeId}
                        corretores={[]}
                        trigger="icon"
                        redirectAfterSave={clienteRedirectAfterSave}
                        disabled={busy}
                      />
                    </div>
                    {clienteListaAberta && linhasClienteFiltradas.length > 0 && (
                      <ul
                        role="listbox"
                        className="absolute top-full right-0 left-0 z-30 mt-1 max-h-52 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10"
                      >
                        {linhasClienteFiltradas.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              role="option"
                              className="flex w-full px-3 py-2 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => escolherCliente(row.id, row.label)}
                            >
                              {row.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {clienteId ? (
                      <p className="text-[11px] text-muted-foreground">
                        Selecionado:{" "}
                        <span className="font-medium text-foreground">
                          {clienteNomeResolvido || "—"}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Obrigatório para confirmar a troca.
                      </p>
                    )}
                  </div>
                </section>

                <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Equipa da loja
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="troca-pdv-vendedor">Quem regista</Label>
                    <select
                      id="troca-pdv-vendedor"
                      className="flex h-10 min-h-10 w-full rounded-md border border-input bg-transparent ps-3 pe-10 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={vendedorId}
                      disabled={busy}
                      onChange={(e) => setVendedorId(e.target.value)}
                    >
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="troca-pdv-obs">Observações</Label>
                    <textarea
                      id="troca-pdv-obs"
                      rows={3}
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      disabled={busy}
                      placeholder="Notas internas (opcional)"
                      className={cn(
                        "min-h-[4.5rem] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      )}
                    />
                  </div>
                </section>

                <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Resumo (novos artigos vs crédito)
                  </p>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Total novos artigos</dt>
                      <dd className="tabular-nums font-medium">
                        {moneyFmt(totalNovos)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Menos crédito (etapa 1)</dt>
                      <dd className="tabular-nums font-medium text-primary">
                        − {moneyFmt(creditoEtapa1)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
                      <dt>Diferença a pagar (indicativa)</dt>
                      <dd className="tabular-nums">{moneyFmt(diferencaPagar)}</dd>
                    </div>
                  </dl>
                  <p className="text-[11px] text-muted-foreground">
                    O registo da troca credita o cliente; a venda dos novos artigos
                    com pagamento usa o fluxo normal no PDV quando aplicável.
                  </p>
                </section>

                {error && etapa === 2 ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-muted/30 px-4 py-3 sm:px-5 sm:py-3.5">
          {etapa === 1 ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 justify-start text-destructive hover:text-destructive touch-manipulation"
                onClick={descartar}
                disabled={busy}
              >
                Descartar
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  disabled={busy}
                  onClick={descartar}
                >
                  Voltar à lista
                </Button>
                <Button
                  type="button"
                  className="min-h-10 touch-manipulation"
                  disabled={busy}
                  onClick={continuarEtapa1}
                >
                  Continuar para substituição
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 justify-start text-destructive hover:text-destructive touch-manipulation"
                onClick={descartar}
                disabled={busy}
              >
                Descartar
              </Button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 touch-manipulation"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    setEtapa(1);
                  }}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Etapa anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  disabled={busy}
                  onClick={descartar}
                >
                  Voltar à lista
                </Button>
                <Button
                  type="button"
                  className="min-h-10 touch-manipulation"
                  disabled={busy}
                  onClick={() => void confirmar()}
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      A registar…
                    </>
                  ) : (
                    "Confirmar troca"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
