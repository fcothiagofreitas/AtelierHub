"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ScanBarcode, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  pdvCreateClienteNomeRapido,
  pdvCreateDraft,
  pdvEnsureClienteForCorretor,
  pdvExcluirPedido,
  pdvFinalizarPedido,
  pdvGetPedidoParaPdv,
  pdvResolverEan,
  pdvSavePedido,
  pdvSearchVariacoes,
  type PdvSearchRow,
} from "@/modules/vendas/pdv-actions";
import { pedidoEstadoLabels, pedidoModalidadeLabels } from "@/modules/vendas/lib/labels";
import { buildVendasHref } from "@/modules/vendas/lib/build-href";
import { ReceberModal } from "@/modules/vendas/components/receber-modal";
import { PedidoResumoLeitura } from "@/modules/vendas/components/pedido-resumo-leitura";
import { VendaAcoesCliente } from "@/modules/vendas/components/venda-acoes-cliente";
import {
  fetchPedidoParaVerModal,
  type PedidoVerPayload,
} from "@/modules/vendas/vendas-ver-actions";

type SelectOption = { id: string; name: string };

type ClienteListaRow =
  | { kind: "cliente"; id: string; label: string }
  | { kind: "corretor"; id: string; label: string };

type CartLine = {
  key: string;
  produtoVariacaoId: string;
  label: string;
  quantidade: number;
  precoUnitario: string;
  saldoRef: number;
};

const panelClass =
  "rounded-xl border border-border bg-card shadow-xs ring-1 ring-foreground/5";
const panelMutedClass =
  "rounded-xl border border-border bg-muted/25 shadow-xs ring-1 ring-foreground/5";

export type VendasPdvProps = {
  storeId: string;
  /** Nome da loja ativa (faixa operacional no modal). */
  storeName: string;
  defaultColaboradorId: string;
  clientes: SelectOption[];
  vendedores: SelectOption[];
  corretores: SelectOption[];
};

function moneyFromInput(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function cartTotal(lines: CartLine[]): number {
  return lines.reduce(
    (acc, L) => acc + moneyFromInput(L.precoUnitario) * L.quantidade,
    0,
  );
}

function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

export function VendasPdv(props: VendasPdvProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("pdv") === "1";
  const editPedidoId = searchParams.get("edit") ?? undefined;
  const viewPedidoId = searchParams.get("view") ?? undefined;
  /** `edit` ganha sobre `view` se ambos existirem na URL. */
  const readOnly = Boolean(viewPedidoId && !editPedidoId);

  const close = React.useCallback(() => {
    const href = buildVendasHref(new URLSearchParams(searchParams.toString()), {
      pdv: null,
      edit: null,
      view: null,
    });
    router.replace(href, { scroll: false });
  }, [router, searchParams]);

  return (
    <PdvModalInner
      {...props}
      open={open}
      editPedidoId={editPedidoId}
      viewPedidoId={viewPedidoId}
      readOnly={readOnly}
      onClose={close}
    />
  );
}

function PdvModalInner({
  storeId,
  storeName,
  defaultColaboradorId,
  clientes,
  vendedores,
  corretores,
  open,
  editPedidoId,
  viewPedidoId,
  readOnly,
  onClose,
}: VendasPdvProps & {
  open: boolean;
  editPedidoId?: string;
  viewPedidoId?: string;
  readOnly: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, startTransition] = React.useTransition();
  const [addingLine, setAddingLine] = React.useState(false);

  const [pedidoId, setPedidoId] = React.useState<string | null>(null);
  const pedidoIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    pedidoIdRef.current = pedidoId;
  }, [pedidoId]);
  const [clienteId, setClienteId] = React.useState("");
  /** Nome mostrado após escolha / cadastro rápido (pedido iniciado). */
  const [clienteNomeResolvido, setClienteNomeResolvido] = React.useState("");
  const [extraClientes, setExtraClientes] = React.useState<SelectOption[]>([]);
  const [clienteQuery, setClienteQuery] = React.useState("");
  const [clienteListaAberta, setClienteListaAberta] = React.useState(false);
  const clienteCampoRef = React.useRef<HTMLDivElement>(null);
  const [vendedorId, setVendedorId] = React.useState(() => {
    if (vendedores.some((v) => v.id === defaultColaboradorId)) {
      return defaultColaboradorId;
    }
    return vendedores[0]?.id ?? "";
  });
  const [corretorId, setCorretorId] = React.useState("");
  const [modalidade, setModalidade] = React.useState<"DIRETA" | "CONSIGNADA">(
    "DIRETA",
  );
  const [lines, setLines] = React.useState<CartLine[]>([]);

  const PDV_PRODUTO_PAGE = 12;

  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [loadingMoreProdutos, setLoadingMoreProdutos] = React.useState(false);
  const [hits, setHits] = React.useState<PdvSearchRow[]>([]);
  const [produtoHasMore, setProdutoHasMore] = React.useState(false);
  const [produtoListaAberta, setProdutoListaAberta] = React.useState(false);
  const produtoBuscaRef = React.useRef<HTMLDivElement>(null);
  const produtoListaRef = React.useRef<HTMLUListElement>(null);
  const hitsRef = React.useRef<PdvSearchRow[]>([]);
  const produtoHasMoreRef = React.useRef(false);
  const loadingMoreProdutosRef = React.useRef(false);
  React.useEffect(() => {
    hitsRef.current = hits;
  }, [hits]);
  React.useEffect(() => {
    produtoHasMoreRef.current = produtoHasMore;
  }, [produtoHasMore]);
  const [ean, setEan] = React.useState("");

  /** Referência estável: `vendedores` vindo do RSC muda a cada refresh e não deve re-disparar o load de edição. */
  const vendedoresRef = React.useRef(vendedores);
  vendedoresRef.current = vendedores;

  const [saveStatus, setSaveStatus] = React.useState<
    "idle" | "saving" | "saved"
  >("idle");

  const [pdvStep, setPdvStep] = React.useState<"cart" | "pagamento">("cart");
  const [totalFinalizado, setTotalFinalizado] = React.useState<number>(0);
  const [pedidoFinalizadoId, setPedidoFinalizadoId] = React.useState<string | null>(null);
  const [ReceberModalOpen, setReceberModalOpen] = React.useState(false);

  /** Pedido finalizado / não-rascunho: UI só leitura (resumo). */
  const [viewDetalhe, setViewDetalhe] = React.useState<{
    storeName: string;
    pedido: PedidoVerPayload;
  } | null>(null);
  const [viewLoading, setViewLoading] = React.useState(false);

  const resetFormState = React.useCallback(() => {
    setPedidoId(null);
    setClienteId("");
    setClienteNomeResolvido("");
    setExtraClientes([]);
    setClienteQuery("");
    setClienteListaAberta(false);
    setVendedorId(
      vendedores.some((v) => v.id === defaultColaboradorId)
        ? defaultColaboradorId
        : (vendedores[0]?.id ?? ""),
    );
    setCorretorId("");
    setModalidade("DIRETA");
    setLines([]);
    setQ("");
    setHits([]);
    setProdutoHasMore(false);
    produtoHasMoreRef.current = false;
    setProdutoListaAberta(false);
    setEan("");
    setSaveStatus("idle");
    pedidoIdRef.current = null;
    setPdvStep("cart");
    setTotalFinalizado(0);
    setPedidoFinalizadoId(null);
    setReceberModalOpen(false);
    setViewDetalhe(null);
    setViewLoading(false);
  }, [defaultColaboradorId, vendedores]);

  React.useEffect(() => {
    if (!open) {
      resetFormState();
    }
  }, [open, resetFormState]);

  /** Ao remover `&edit=` da URL com o modal aberto, volta ao modo nova venda. */
  const prevEditRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!open) {
      prevEditRef.current = undefined;
      return;
    }
    const prev = prevEditRef.current;
    prevEditRef.current = editPedidoId;
    if (prev && !editPedidoId) {
      resetFormState();
    }
  }, [open, editPedidoId, resetFormState]);

  /**
   * Carrega rascunho existente para edição.
   * Não incluir `vendedores` (nem outros arrays do RSC) nas deps: após cada save há
   * revalidate e nova referência, o que re-disparava este efeito e alternava com o auto-save.
   */
  const hydratedEditPedidoKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open) {
      hydratedEditPedidoKeyRef.current = null;
      return;
    }
    if (!editPedidoId) {
      hydratedEditPedidoKeyRef.current = null;
      return;
    }
    if (hydratedEditPedidoKeyRef.current === editPedidoId) {
      return;
    }
    let cancelled = false;
    const pedidoIdToLoad = editPedidoId;
    startTransition(async () => {
      const r = await pdvGetPedidoParaPdv({
        storeId,
        pedidoId: pedidoIdToLoad,
      });
      if (cancelled) return;
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if (!("ok" in r) || !r.ok) return;
      const d = r.data;
      pedidoIdRef.current = d.pedidoId;
      setPedidoId(d.pedidoId);
      setClienteId(d.clienteId ?? "");
      setClienteNomeResolvido(d.clienteNomeExibicao);
      setClienteQuery(d.clienteNomeExibicao);
      setCorretorId(d.corretorId ?? "");
      setModalidade(d.modalidade);
      setVendedorId(d.vendedorId);
      setLines(
        d.lines.map((L) => ({
          key: crypto.randomUUID(),
          produtoVariacaoId: L.produtoVariacaoId,
          label: L.label,
          quantidade: L.quantidade,
          precoUnitario: L.precoUnitario,
          saldoRef: L.saldoRef,
        })),
      );
      setSaveStatus("saved");
      hydratedEditPedidoKeyRef.current = pedidoIdToLoad;
    });
    return () => {
      cancelled = true;
    };
  }, [open, editPedidoId, storeId]);

  /** Modo `view`: tenta rascunho (pdvGet); senão carrega resumo completo (pedido finalizado). */
  const hydratedViewPedidoKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open || !readOnly || !viewPedidoId) {
      hydratedViewPedidoKeyRef.current = null;
      if (!readOnly) setViewDetalhe(null);
      return;
    }
    if (hydratedViewPedidoKeyRef.current === viewPedidoId) {
      return;
    }
    let cancelled = false;
    setViewLoading(true);
    setViewDetalhe(null);
    startTransition(async () => {
      const draft = await pdvGetPedidoParaPdv({
        storeId,
        pedidoId: viewPedidoId,
      });
      if (cancelled) return;
      if ("ok" in draft && draft.ok) {
        const d = draft.data;
        pedidoIdRef.current = d.pedidoId;
        setPedidoId(d.pedidoId);
        setClienteId(d.clienteId ?? "");
        setClienteNomeResolvido(d.clienteNomeExibicao);
        setClienteQuery(d.clienteNomeExibicao);
        setCorretorId(d.corretorId ?? "");
        setModalidade(d.modalidade);
        setVendedorId(d.vendedorId);
        setLines(
          d.lines.map((L) => ({
            key: crypto.randomUUID(),
            produtoVariacaoId: L.produtoVariacaoId,
            label: L.label,
            quantidade: L.quantidade,
            precoUnitario: L.precoUnitario,
            saldoRef: L.saldoRef,
          })),
        );
        setSaveStatus("saved");
        hydratedViewPedidoKeyRef.current = viewPedidoId;
        setViewLoading(false);
        return;
      }
      const detail = await fetchPedidoParaVerModal(viewPedidoId);
      if (cancelled) return;
      if (!detail.ok) {
        toast.error(detail.error);
        setViewLoading(false);
        return;
      }
      pedidoIdRef.current = null;
      setPedidoId(null);
      setLines([]);
      setViewDetalhe({
        storeName: detail.storeName,
        pedido: detail.pedido,
      });
      hydratedViewPedidoKeyRef.current = viewPedidoId;
      setViewLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, readOnly, viewPedidoId, storeId]);

  React.useEffect(() => {
    if (!clienteListaAberta) return;
    const fechar = (e: MouseEvent) => {
      if (
        clienteCampoRef.current &&
        !clienteCampoRef.current.contains(e.target as Node)
      ) {
        setClienteListaAberta(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [clienteListaAberta]);

  React.useEffect(() => {
    if (!produtoListaAberta) return;
    const fechar = (e: MouseEvent) => {
      if (
        produtoBuscaRef.current &&
        !produtoBuscaRef.current.contains(e.target as Node)
      ) {
        setProdutoListaAberta(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [produtoListaAberta]);

  React.useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = window.setTimeout(() => setSaveStatus("idle"), 3500);
    return () => window.clearTimeout(t);
  }, [saveStatus]);

  const linhasClienteCorretor = React.useMemo((): ClienteListaRow[] => {
    const rows: ClienteListaRow[] = [
      ...clientes.map((c) => ({
        kind: "cliente" as const,
        id: c.id,
        label: c.name,
      })),
      ...corretores.map((c) => ({
        kind: "corretor" as const,
        id: c.id,
        label: `${c.name} · corretor`,
      })),
      ...extraClientes.map((c) => ({
        kind: "cliente" as const,
        id: c.id,
        label: c.name,
      })),
    ];
    return rows.sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
    );
  }, [clientes, corretores, extraClientes]);

  const linhasClienteFiltradas = React.useMemo(() => {
    const qv = clienteQuery.trim().toLowerCase();
    if (qv.length === 0) return linhasClienteCorretor.slice(0, 50);
    return linhasClienteCorretor
      .filter((r) => r.label.toLowerCase().includes(qv))
      .slice(0, 50);
  }, [clienteQuery, linhasClienteCorretor]);

  const queryTrim = clienteQuery.trim();
  const queryNorm = normLabel(clienteQuery);
  const hasExactClienteMatch = linhasClienteCorretor.some(
    (r) => normLabel(r.label) === queryNorm,
  );

  const podeCadastrarNomeRapido =
    !clienteId &&
    queryTrim.length >= 2 &&
    queryTrim.length <= 200 &&
    linhasClienteFiltradas.length === 0 &&
    !hasExactClienteMatch;

  const escolherLinha = (row: ClienteListaRow) => {
    if (row.kind === "cliente") {
      setClienteId(row.id);
      setClienteNomeResolvido(row.label);
      setClienteQuery(row.label);
      setClienteListaAberta(false);
      return;
    }
    startTransition(async () => {
      const r = await pdvEnsureClienteForCorretor({
        storeId,
        corretorId: row.id,
      });
      if (!("ok" in r) || !r.ok) {
        toast.error("error" in r ? r.error : "Não foi possível usar o corretor.");
        return;
      }
      setClienteId(r.clienteId);
      setCorretorId(row.id);
      setClienteNomeResolvido(row.label);
      setClienteQuery(row.label);
      setClienteListaAberta(false);
      router.refresh();
    });
  };

  const cadastrarNomeRapido = () => {
    const nome = clienteQuery.trim();
    if (nome.length < 2) return;
    startTransition(async () => {
      const r = await pdvCreateClienteNomeRapido({ storeId, nome });
      if (!("ok" in r) || !r.ok) {
        toast.error("error" in r ? r.error : "Não foi possível cadastrar.");
        return;
      }
      setClienteId(r.clienteId);
      setClienteNomeResolvido(nome);
      setExtraClientes((prev) => [
        ...prev.filter((p) => p.id !== r.clienteId),
        { id: r.clienteId, name: nome },
      ]);
      setClienteListaAberta(false);
      toast.success("Cliente cadastrado.");
      router.refresh();
    });
  };

  const persistPedido = React.useCallback(async (): Promise<boolean> => {
    if (!pedidoId) return false;
    const r = await pdvSavePedido({
      storeId,
      pedidoId,
      clienteId: clienteId.trim() ? clienteId : null,
      vendedorId,
      corretorId: corretorId || null,
      modalidade,
      itens: lines.map((L) => ({
        produtoVariacaoId: L.produtoVariacaoId,
        quantidade: L.quantidade,
        precoUnitario: L.precoUnitario,
      })),
    });
    if ("error" in r && r.error) {
      toast.error(r.error);
      return false;
    }
    return true;
  }, [
    storeId,
    pedidoId,
    clienteId,
    vendedorId,
    corretorId,
    modalidade,
    lines,
  ]);

  const salvarAgora = React.useCallback(() => {
    if (!pedidoId) {
      toast.message("Ainda não há rascunho — adicione um produto.");
      return;
    }
    setSaveStatus("saving");
    startTransition(async () => {
      const ok = await persistPedido();
      if (ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("idle");
      }
    });
  }, [pedidoId, persistPedido]);

  React.useEffect(() => {
    if (!open || !pedidoId) {
      setSaveStatus("idle");
      return;
    }
    setSaveStatus("saving");
    const t = window.setTimeout(() => {
      startTransition(async () => {
        const ok = await persistPedido();
        if (!ok) {
          setSaveStatus("idle");
          return;
        }
        setSaveStatus("saved");
      });
    }, 750);
    return () => window.clearTimeout(t);
  }, [open, pedidoId, persistPedido]);

  const fetchProdutos = React.useCallback(
    async (opts: { reset: boolean; append: boolean }) => {
      const query = q.trim();
      const append = opts.append && !opts.reset;

      if (append) {
        if (!produtoHasMoreRef.current || loadingMoreProdutosRef.current) {
          return;
        }
        loadingMoreProdutosRef.current = true;
        setLoadingMoreProdutos(true);
      } else {
        setSearching(true);
        setHits([]);
        hitsRef.current = [];
      }

      try {
        const skip = append ? hitsRef.current.length : 0;
        const r = await pdvSearchVariacoes({
          storeId,
          query,
          skip,
          pageSize: PDV_PRODUTO_PAGE,
        });
        if ("error" in r) {
          toast.error(r.error);
          if (!append) {
            setHits([]);
            setProdutoHasMore(false);
            produtoHasMoreRef.current = false;
          }
          return;
        }
        if (append) {
          setHits((prev) => {
            const seen = new Set(prev.map((x) => x.id));
            const extra = r.rows.filter((row) => !seen.has(row.id));
            return [...prev, ...extra];
          });
        } else {
          setHits(r.rows);
        }
        setProdutoHasMore(r.hasMore);
        produtoHasMoreRef.current = r.hasMore;
      } finally {
        setSearching(false);
        setLoadingMoreProdutos(false);
        loadingMoreProdutosRef.current = false;
      }
    },
    [q, storeId],
  );

  /** Primeira página ou novo filtro (botão Buscar, Enter, texto debounced). */
  const runSearch = React.useCallback(async () => {
    await fetchProdutos({ reset: true, append: false });
  }, [fetchProdutos]);

  React.useEffect(() => {
    if (!produtoListaAberta || !open) return;
    const delay = q.trim().length >= 2 ? 280 : 0;
    const t = window.setTimeout(() => {
      void fetchProdutos({ reset: true, append: false });
    }, delay);
    return () => window.clearTimeout(t);
  }, [q, produtoListaAberta, open, fetchProdutos]);

  const onProdutoListaScroll = React.useCallback(
    (e: React.UIEvent<HTMLUListElement>) => {
      const el = e.currentTarget;
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 72;
      if (!nearBottom) return;
      void fetchProdutos({ reset: false, append: true });
    },
    [fetchProdutos],
  );

  const ensureDraft = React.useCallback(async (): Promise<boolean> => {
    if (pedidoIdRef.current) return true;
    if (!vendedorId) {
      toast.error("Escolha um vendedor antes de adicionar produtos.");
      return false;
    }
    const r = await pdvCreateDraft({
      storeId,
      clienteId: clienteId.trim() ? clienteId : null,
      vendedorId,
      corretorId: corretorId || null,
      modalidade,
    });
    if (!("ok" in r) || !r.ok) {
      toast.error("error" in r ? r.error : "Não foi possível criar o rascunho.");
      return false;
    }
    pedidoIdRef.current = r.pedidoId;
    setPedidoId(r.pedidoId);
    return true;
  }, [storeId, clienteId, vendedorId, corretorId, modalidade]);

  const pushLine = React.useCallback((row: PdvSearchRow) => {
    const price = row.precoSugerido ?? "0";
    setLines((prev) => {
      const existing = prev.find((p) => p.produtoVariacaoId === row.id);
      if (existing) {
        return prev.map((p) =>
          p.produtoVariacaoId === row.id
            ? {
                ...p,
                quantidade:
                  row.saldo > 0
                    ? Math.min(p.quantidade + 1, row.saldo)
                    : p.quantidade + 1,
              }
            : p,
        );
      }
      const label = `${row.produtoNome} — ${row.nome}`;
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          produtoVariacaoId: row.id,
          label,
          quantidade: 1,
          precoUnitario: price,
          saldoRef: row.saldo,
        },
      ];
    });
    if (row.saldo <= 0) {
      toast.message("Atenção: saldo zero nesta loja para este SKU.");
    }
  }, []);

  const addRow = React.useCallback(
    async (row: PdvSearchRow) => {
      setAddingLine(true);
      try {
        const ok = await ensureDraft();
        if (!ok) return;
        pushLine(row);
      } finally {
        setAddingLine(false);
      }
    },
    [ensureDraft, pushLine],
  );

  const onBarcode = React.useCallback(
    async (eanRawOverride?: string) => {
      const raw = (eanRawOverride ?? ean).trim();
      const r = await pdvResolverEan({ storeId, eanRaw: raw });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      if (!r.found) {
        toast.error("EAN não encontrado.");
        return;
      }
      setAddingLine(true);
      try {
        const ok = await ensureDraft();
        if (!ok) return;
        pushLine(r.row);
        setEan("");
        toast.success("Produto adicionado.");
      } finally {
        setAddingLine(false);
      }
    },
    [ean, storeId, ensureDraft, pushLine],
  );

  const finalizar = () => {
    if (!pedidoId) return;
    if (!clienteId.trim()) {
      toast.error("Selecione um comprador antes de finalizar a venda.");
      return;
    }
    startTransition(async () => {
      const r = await pdvFinalizarPedido({ storeId, pedidoId });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      const total = cartTotal(lines);
      setTotalFinalizado(total);
      setPedidoFinalizadoId(pedidoId);
      setPdvStep("pagamento");
    });
  };

  const salvarEmAberto = () => {
    toast.message("Venda em aberto. Registe o pagamento na página do pedido quando necessário.");
    onClose();
    router.refresh();
  };

  const descartar = () => {
    if (!pedidoId) {
      onClose();
      return;
    }
    if (!window.confirm("Excluir este pedido em andamento?")) return;
    startTransition(async () => {
      const r = await pdvExcluirPedido({ storeId, pedidoId });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.message("Pedido em andamento removido.");
      onClose();
      router.refresh();
    });
  };

  const totalFmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cartTotal(lines));


  const clienteBloqueado = Boolean(pedidoId && clienteId.trim());

  const clienteListaVaziaComFiltro =
    clienteListaAberta &&
    queryTrim.length > 0 &&
    linhasClienteFiltradas.length === 0;

  const moneyFmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const lockUi =
    readOnly && !viewDetalhe && Boolean(pedidoId) && !viewLoading;
  const showResumoDetalhe = Boolean(viewDetalhe);
  const showCartGrid =
    !readOnly ||
    (readOnly && !viewDetalhe && Boolean(pedidoId) && !viewLoading);
  const showViewLoadError =
    readOnly &&
    !viewDetalhe &&
    !viewLoading &&
    !pedidoId &&
    Boolean(viewPedidoId);

  const spForLinks = React.useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const fluxoLabel =
    readOnly && lockUi
      ? "Leitura"
      : !pedidoId
        ? "Antes de gravar"
        : "Rascunho · em andamento";

  if (pdvStep === "pagamento" && pedidoFinalizadoId) {
    return (
      <>
        <Dialog open={open} onOpenChange={(v) => !v && salvarEmAberto()}>
          <DialogContent
            showCloseButton={false}
            className={cn(
              "top-1/2 left-1/2 flex h-auto max-h-[min(80vh,calc(100dvh-2rem))] w-[min(480px,calc(100vw-2rem))] max-w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden p-0",
            )}
          >
            <div className="shrink-0 border-b px-5 py-4">
              <DialogHeader className="text-left">
                <DialogTitle>Venda finalizada</DialogTitle>
                <DialogDescription>
                  Stock actualizado. Escolha como prosseguir com este pedido.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-5 py-5">
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total da venda</span>
                  <span className="text-base font-semibold tabular-nums">
                    {moneyFmt.format(totalFinalizado)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-medium text-amber-500">Saldo em aberto</span>
                  <span className="font-semibold tabular-nums text-amber-500">
                    {moneyFmt.format(totalFinalizado)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t bg-muted/30 px-5 py-4">
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 flex-1 touch-manipulation"
                  onClick={salvarEmAberto}
                  disabled={busy}
                >
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 flex-1 touch-manipulation"
                  disabled
                  title="Em breve"
                >
                  Entregar
                </Button>
                <Button
                  type="button"
                  className="min-h-10 flex-1 touch-manipulation"
                  onClick={() => setReceberModalOpen(true)}
                  disabled={busy}
                >
                  Receber
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ReceberModal
          open={ReceberModalOpen}
          onClose={() => setReceberModalOpen(false)}
          storeId={storeId}
          pedidoId={pedidoFinalizadoId}
          totalPedido={totalFinalizado}
          totalJaPago={0}
          onConfirm={() => {
            setReceberModalOpen(false);
            onClose();
            router.refresh();
          }}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton
        className={cn(
          "top-1/2 left-1/2 flex h-[min(80vh,calc(100dvh-2rem))] max-h-[min(80vh,calc(100dvh-2rem))] w-[min(80vw,calc(100vw-2rem))] max-w-[min(80vw,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden p-0",
          "[&_[data-slot=dialog-close]]:min-h-10 [&_[data-slot=dialog-close]]:min-w-10 [&_[data-slot=dialog-close]]:touch-manipulation",
        )}
      >
        <div className="shrink-0 border-b px-4 py-3 sm:px-5">
          {showResumoDetalhe && viewDetalhe ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <DialogHeader className="text-left sm:min-w-0 sm:flex-1">
                <DialogTitle>Pedido nº {viewDetalhe.pedido.numero}</DialogTitle>
                <DialogDescription>
                  {new Date(viewDetalhe.pedido.createdAt).toLocaleString("pt-BR", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {pedidoEstadoLabels[viewDetalhe.pedido.estado]}
                </Badge>
                <Badge variant="outline">
                  {pedidoModalidadeLabels[viewDetalhe.pedido.modalidade]}
                </Badge>
                {viewDetalhe.pedido.estado === "EM_ANDAMENTO" ? (
                  <Link
                    href={buildVendasHref(spForLinks, {
                      pdv: "1",
                      edit: viewDetalhe.pedido.id,
                      view: null,
                    })}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Editar no PDV
                  </Link>
                ) : null}
                <VendaAcoesCliente
                  storeId={storeId}
                  pedidoId={viewDetalhe.pedido.id}
                  totalPedido={
                    viewDetalhe.pedido.total ??
                    viewDetalhe.pedido.itens.reduce(
                      (a, it) => a + it.quantidade * it.precoUnitario,
                      0,
                    )
                  }
                  totalJaPago={viewDetalhe.pedido.pagamentos.reduce(
                    (a, p) => a + p.valor,
                    0,
                  )}
                  showReceber={
                    (viewDetalhe.pedido.estado === "EM_ABERTO" ||
                      viewDetalhe.pedido.estado === "PAGO_PARCIAL") &&
                    (viewDetalhe.pedido.total ?? 0) -
                      viewDetalhe.pedido.pagamentos.reduce((a, p) => a + p.valor, 0) >
                      0.004
                  }
                  onSalvar={onClose}
                  onPagamentoRegistado={() => {
                    if (!viewPedidoId) return;
                    void (async () => {
                      const r = await fetchPedidoParaVerModal(viewPedidoId);
                      if (r.ok) {
                        setViewDetalhe({
                          storeName: r.storeName,
                          pedido: r.pedido,
                        });
                      }
                      router.refresh();
                    })();
                  }}
                />
              </div>
            </div>
          ) : (
            <DialogHeader className="text-left">
              <DialogTitle>
                {readOnly && lockUi
                  ? "Ver pedido (leitura)"
                  : editPedidoId
                    ? "Continuar venda (PDV)"
                    : "Nova venda (PDV)"}
              </DialogTitle>
              <DialogDescription>
                {readOnly && lockUi
                  ? "Apenas consulta — sem alterações ao carrinho."
                  : "Equipa de venda e produtos; o comprador pode ficar em branco até finalizar. O rascunho guarda na loja atual (automático ou \"Guardar agora\"). Ao finalizar, exige comprador e aplica baixa de stock (pedido em aberto)."}
              </DialogDescription>
            </DialogHeader>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {showResumoDetalhe && viewDetalhe ? (
            <PedidoResumoLeitura
              storeName={viewDetalhe.storeName}
              pedido={viewDetalhe.pedido}
            />
          ) : null}
          {readOnly && viewLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <span className="text-sm">A carregar pedido…</span>
            </div>
          ) : null}
          {showViewLoadError ? (
            <p className="py-12 text-center text-sm text-destructive">
              Não foi possível carregar o pedido.
            </p>
          ) : null}
          {showCartGrid ? (
          <>
          <div
            className={cn(
              "mb-4 flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between",
              panelMutedClass,
              "px-3 py-2.5",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-foreground">{storeName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{fluxoLabel}</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span
                className={cn(
                  "min-h-[1.25rem] text-xs tabular-nums",
                  saveStatus === "saving" &&
                    "text-amber-600 dark:text-amber-500",
                  saveStatus === "saved" && "text-muted-foreground",
                  saveStatus === "idle" && "text-muted-foreground",
                )}
              >
                {saveStatus === "saving" && "A guardar…"}
                {saveStatus === "saved" && "Guardado"}
                {saveStatus === "idle" &&
                  !pedidoId &&
                  "Adicione o primeiro produto para criar o rascunho."}
                {saveStatus === "idle" &&
                  pedidoId &&
                  "Alterações sincronizam ao editar; também podes guardar já."}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-9 touch-manipulation"
                disabled={!pedidoId || busy || lockUi}
                onClick={salvarAgora}
              >
                Guardar agora
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {/* Coluna esquerda: produtos + carrinho (prioridade balcão) */}
            <div className="order-1 flex flex-col gap-4 lg:order-1">
              <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Produtos
                </p>
                <div ref={produtoBuscaRef} className="relative space-y-1">
                  <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Nome, referência ou EAN…"
                        value={q}
                        autoComplete="off"
                        onChange={(e) => {
                          setQ(e.target.value);
                          setProdutoListaAberta(true);
                        }}
                        onFocus={() => setProdutoListaAberta(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setProdutoListaAberta(false);
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void runSearch();
                          }
                        }}
                        disabled={addingLine || lockUi}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-10 shrink-0 touch-manipulation"
                      onClick={() => void runSearch()}
                      disabled={searching || addingLine || lockUi}
                    >
                      {searching ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Buscar"
                      )}
                    </Button>
                  </div>
                  {produtoListaAberta && (
                    <ul
                      ref={produtoListaRef}
                      role="listbox"
                      onScroll={onProdutoListaScroll}
                      className="absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10"
                    >
                      {searching && hits.length === 0 && (
                        <li className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                          <Loader2 className="size-4 shrink-0 animate-spin" />
                          A carregar produtos…
                        </li>
                      )}
                      {hits.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            role="option"
                            disabled={addingLine || lockUi}
                            className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              void addRow(h);
                              setProdutoListaAberta(false);
                            }}
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
                      {q.trim().length >= 2 &&
                        !searching &&
                        hits.length === 0 && (
                          <li className="px-3 py-2 text-muted-foreground">
                            Nenhum produto encontrado.
                          </li>
                        )}
                      {q.trim().length < 2 &&
                        !searching &&
                        hits.length === 0 && (
                          <li className="px-3 py-2 text-muted-foreground">
                            Sem produtos no catálogo.
                          </li>
                        )}
                      {loadingMoreProdutos && (
                        <li className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                          A carregar mais…
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                <div className="relative">
                  <ScanBarcode className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-8 font-mono text-sm"
                    placeholder="Código de barras (Enter ou Tab após ler)"
                    inputMode="numeric"
                    autoComplete="off"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onBarcode();
                        return;
                      }
                      if (e.key === "Tab") {
                        const v = (e.currentTarget as HTMLInputElement).value;
                        const digits = v.replace(/\D/g, "");
                        if (digits.length >= 8 && digits.length <= 14) {
                          e.preventDefault();
                          void onBarcode(v);
                        }
                      }
                    }}
                    disabled={addingLine || lockUi}
                  />
                </div>
              </section>

              <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Carrinho e total
                </p>
                {lines.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                    Nenhum item. Defina o vendedor, depois busque ou leia um EAN.
                    O comprador pode ser escolhido depois; é obrigatório só para
                    finalizar.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full min-w-[480px] text-xs sm:text-sm">
                      <thead className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground uppercase">
                        <tr>
                          <th className="px-2 py-1.5 font-medium sm:px-3">
                            Produto
                          </th>
                          <th className="px-2 py-1.5 font-medium sm:px-3">
                            Qtd
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium sm:px-3">
                            Preço un.
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium sm:px-3">
                            Subtotal
                          </th>
                          <th className="w-10 px-1 sm:px-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lines.map((L) => {
                          const sub =
                            moneyFromInput(L.precoUnitario) * L.quantidade;
                          return (
                            <tr key={L.key} className="bg-card">
                              <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                                <span className="font-medium">{L.label}</span>
                                <span className="ml-2 text-[11px] text-muted-foreground">
                                  (stock {L.saldoRef})
                                </span>
                              </td>
                              <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 min-h-9 w-9 min-w-9 shrink-0 touch-manipulation"
                                    disabled={lockUi}
                                    onClick={() =>
                                      setLines((prev) =>
                                        prev.map((x) =>
                                          x.key === L.key
                                            ? {
                                                ...x,
                                                quantidade: Math.max(
                                                  1,
                                                  x.quantidade - 1,
                                                ),
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
                                    disabled={lockUi}
                                    onClick={() =>
                                      setLines((prev) =>
                                        prev.map((x) =>
                                          x.key === L.key
                                            ? {
                                                ...x,
                                                quantidade: Math.min(
                                                  x.saldoRef > 0
                                                    ? x.saldoRef
                                                    : x.quantidade + 999,
                                                  x.quantidade + 1,
                                                ),
                                              }
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
                                  value={L.precoUnitario}
                                  disabled={lockUi}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setLines((prev) =>
                                      prev.map((x) =>
                                        x.key === L.key
                                          ? { ...x, precoUnitario: v }
                                          : x,
                                      ),
                                    );
                                  }}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right align-middle tabular-nums sm:px-3 sm:py-2">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(sub)}
                              </td>
                              <td className="px-1 py-1.5 text-right align-middle sm:px-2 sm:py-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 min-h-9 w-9 min-w-9 text-destructive hover:text-destructive"
                                  disabled={lockUi}
                                  onClick={() =>
                                    setLines((prev) =>
                                      prev.filter((x) => x.key !== L.key),
                                    )
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
                )}
                <div className="flex items-baseline justify-end gap-2 border-t border-border pt-3">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Total
                  </span>
                  <span className="text-lg font-semibold tabular-nums tracking-tight">
                    {totalFmt}
                  </span>
                </div>
              </section>
            </div>

            {/* Coluna direita: comprador + equipa */}
            <div className="order-2 flex flex-col gap-4 lg:order-2">
              <section className={cn("space-y-3 p-3 sm:p-4", panelClass)}>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Comprador
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="pdv-cliente">Cliente</Label>
                  {clienteBloqueado ? (
                    <p
                      id="pdv-cliente"
                      className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-medium"
                    >
                      {clienteNomeResolvido || "—"}
                    </p>
                  ) : (
                    <div ref={clienteCampoRef} className="relative space-y-2">
                      <Input
                        id="pdv-cliente"
                        autoComplete="off"
                        placeholder="Buscar cliente ou corretor, ou escreva um nome novo…"
                        value={clienteQuery}
                        disabled={lockUi}
                        onChange={(e) => {
                          setClienteQuery(e.target.value);
                          setClienteId("");
                          setClienteNomeResolvido("");
                          setClienteListaAberta(true);
                        }}
                        onFocus={() => setClienteListaAberta(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setClienteListaAberta(false);
                          }
                        }}
                        className="pr-10"
                      />
                      {clienteListaAberta &&
                        linhasClienteFiltradas.length > 0 && (
                          <ul
                            role="listbox"
                            className="absolute top-full right-0 left-0 z-30 mt-1 max-h-52 overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md ring-2 ring-foreground/10"
                          >
                            {linhasClienteFiltradas.map((row) => (
                              <li key={`${row.kind}-${row.id}`}>
                                <button
                                  type="button"
                                  role="option"
                                  className="flex w-full px-3 py-2 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => escolherLinha(row)}
                                >
                                  <span className="flex-1">{row.label}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    {row.kind === "corretor" ? "corr." : "cli."}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      {clienteListaVaziaComFiltro && (
                        <p className="text-sm text-muted-foreground">
                          Sem resultados — podes cadastrar com este nome no botão
                          abaixo.
                        </p>
                      )}
                      {podeCadastrarNomeRapido && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left text-xs"
                          onClick={cadastrarNomeRapido}
                          disabled={busy || lockUi}
                        >
                          + Cadastrar &quot;{queryTrim}&quot; só com este nome
                        </Button>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Clientes e corretores cadastrados aparecem na lista. Sem
                        resultados, usa o cadastro rápido.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className={cn("space-y-3 p-3 sm:p-4", panelMutedClass)}>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Equipa de venda
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="pdv-vendedor">Vendedor</Label>
                  <select
                    id="pdv-vendedor"
                    className="flex h-10 min-h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={vendedorId}
                    disabled={!!pedidoId || lockUi}
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
                  <Label htmlFor="pdv-corretor">Corretor (opcional)</Label>
                  <select
                    id="pdv-corretor"
                    className="flex h-10 min-h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={corretorId}
                    disabled={lockUi}
                    onChange={(e) => setCorretorId(e.target.value)}
                  >
                    <option value="">—</option>
                    {corretores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <div className="flex flex-wrap gap-2">
                    {(["DIRETA", "CONSIGNADA"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={!!pedidoId || lockUi}
                        onClick={() => setModalidade(m)}
                        className={cn(
                          "min-h-10 rounded-md border px-3 py-2 text-xs font-medium transition-colors touch-manipulation",
                          modalidade === m
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-muted/60",
                        )}
                      >
                        {pedidoModalidadeLabels[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
          </>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t bg-muted/30 px-5 py-4 sm:px-6">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {!showResumoDetalhe ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 justify-start text-destructive hover:text-destructive touch-manipulation"
                onClick={descartar}
                disabled={busy || lockUi}
              >
                Descartar
              </Button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-10 w-full touch-manipulation sm:w-auto"
                onClick={onClose}
              >
                Fechar
              </Button>
              {!showResumoDetalhe ? (
                <Button
                  type="button"
                  className="min-h-10 w-full touch-manipulation sm:w-auto"
                  onClick={finalizar}
                  disabled={
                    !pedidoId ||
                    lines.length === 0 ||
                    !clienteId.trim() ||
                    busy ||
                    lockUi
                  }
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Finalizar venda
                </Button>
              ) : null}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
