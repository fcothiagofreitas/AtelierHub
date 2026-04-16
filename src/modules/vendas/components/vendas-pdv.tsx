"use client";

/**
 * PDV: um único Dialog em `/vendas?pdv=1`. Query `edit=<pedidoId>` = continuar rascunho;
 * `view=<pedidoId>` = ver pedido (read-only). `pagamento=1` com pedido em aberto abre o painel de venda finalizada;
 * com pedido quitado abre o mesmo painel em modo só leitura (itens + pagamentos, sem formas de pagamento).
 * Se `edit` e `view` vierem juntos, **edit ganha**.
 */
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
import { clientRandomId } from "@/lib/random-id";
import { cn } from "@/lib/utils";
import {
  pdvCreateDraft,
  pdvEnsureClienteForCorretor,
  pdvExcluirPedido,
  pdvEntregarPedido,
  pdvFinalizarPedido,
  pdvGetPedidoParaPdv,
  pdvGetResumoPagamentoPedido,
  pdvResolverEan,
  pdvAtualizarObservacoesPedido,
  pdvSavePedido,
  pdvSearchVariacoes,
  type PdvSearchRow,
} from "@/modules/vendas/pdv-actions";
import { pedidoModalidadeLabels } from "@/modules/vendas/lib/labels";
import { PedidoEstadoBadge } from "@/modules/vendas/components/pedido-estado-badge";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";
import { buildVendasHref } from "@/modules/vendas/lib/build-href";
import { PdvVendaFinalizadaPanel } from "@/modules/vendas/components/pdv-venda-finalizada-panel";
import { VendaAcoesCliente } from "@/modules/vendas/components/venda-acoes-cliente";
import { ClienteNovoDialog } from "@/modules/clientes/components/cliente-novo-dialog";
import type { FormaPagamento } from "@prisma/client";
import {
  fetchPedidoParaVerModal,
  type PedidoVerPayload,
} from "@/modules/vendas/vendas-ver-actions";

type SelectOption = { id: string; name: string };

/** Corretores podem estar bloqueados (venda direta ok; consignação na entrega). */
type PdvCorretorOption = SelectOption & { isBlocked?: boolean };

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
  corretores: PdvCorretorOption[];
  /** Gerente/admin podem mudar o vendedor com pedido já iniciado; vendedor comum não. */
  pdvPodeAlterarVendedorComPedido?: boolean;
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

function snapshotPedidoCart(
  clienteId: string,
  corretorId: string,
  vendedorId: string,
  observacoes: string,
  lines: CartLine[],
): string {
  return JSON.stringify({
    clienteId,
    corretorId,
    vendedorId,
    observacoes,
    lines: lines
      .map((L) => ({
        id: L.produtoVariacaoId,
        q: L.quantidade,
        p: L.precoUnitario,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
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
      pagamento: null,
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
  pdvPodeAlterarVendedorComPedido = false,
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
  const clienteRedirectAfterSave = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("pdv", "1");
    return `/vendas?${p.toString()}`;
  }, [searchParams]);

  /** Só acções explícitas do utilizador — sem `useTransition` em segundo plano a bloquear o UI. */
  const [actionBusy, setActionBusy] = React.useState(false);
  const [addingLine, setAddingLine] = React.useState(false);

  const [pedidoId, setPedidoId] = React.useState<string | null>(null);
  const pedidoIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    pedidoIdRef.current = pedidoId;
  }, [pedidoId]);
  const [clienteId, setClienteId] = React.useState("");
  /** Nome mostrado após escolha ou regresso do cadastro de cliente. */
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
  const [pedidoObservacoes, setPedidoObservacoes] = React.useState("");
  const pedidoObservacoesAoFocarRef = React.useRef("");
  const [lines, setLines] = React.useState<CartLine[]>([]);
  /** Alinhado ao último `pdvSavePedido` com sucesso ou carga do servidor; comparação para rascunho sujo. */
  const [savedCartSnapshot, setSavedCartSnapshot] = React.useState("");

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

  const [pdvStep, setPdvStep] = React.useState<"cart" | "pagamento">("cart");
  const [totalFinalizado, setTotalFinalizado] = React.useState<number>(0);
  const [pedidoFinalizadoId, setPedidoFinalizadoId] = React.useState<string | null>(null);
  /** Totais e pagamentos após finalizar (ecrã «Venda finalizada»). */
  const [finalizaResumo, setFinalizaResumo] = React.useState<{
    totalPedido: number;
    totalPago: number;
    pagamentos: Array<{
      id: string;
      forma: FormaPagamento;
      valor: number;
      createdAt?: string;
    }>;
  } | null>(null);
  /** Reservado para futuros fluxos que registem consignação antes do passo de pagamento. */
  const [entregaJaRegistadaNestaFinalizacao, setEntregaJaRegistadaNestaFinalizacao] =
    React.useState(false);
  /** Painel `pagamento=1` para pedido quitado: resumo sem formas de recebimento. */
  const [pagamentoPainelSomenteLeitura, setPagamentoPainelSomenteLeitura] =
    React.useState(false);
  /** Payload completo + loja para o resumo quitado (vendedor, cliente, itens detalhados, etc.). */
  const [pedidoQuitadoResumo, setPedidoQuitadoResumo] = React.useState<{
    storeName: string;
    pedido: PedidoVerPayload;
  } | null>(null);

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
    setPedidoObservacoes("");
    setLines([]);
    setQ("");
    setHits([]);
    setProdutoHasMore(false);
    produtoHasMoreRef.current = false;
    setProdutoListaAberta(false);
    setEan("");
    pedidoIdRef.current = null;
    setPdvStep("cart");
    setTotalFinalizado(0);
    setPedidoFinalizadoId(null);
    setFinalizaResumo(null);
    setEntregaJaRegistadaNestaFinalizacao(false);
    setPagamentoPainelSomenteLeitura(false);
    setPedidoQuitadoResumo(null);
    setViewDetalhe(null);
    setViewLoading(false);
    setSavedCartSnapshot("");
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
    void (async () => {
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
      setVendedorId(d.vendedorId);
      setPedidoObservacoes(d.observacoes ?? "");
      setLines(
        d.lines.map((L) => ({
          key: clientRandomId(),
          produtoVariacaoId: L.produtoVariacaoId,
          label: L.label,
          quantidade: L.quantidade,
          precoUnitario: L.precoUnitario,
          saldoRef: L.saldoRef,
        })),
      );
      setSavedCartSnapshot(
        snapshotPedidoCart(
          d.clienteId ?? "",
          d.corretorId ?? "",
          d.vendedorId,
          d.observacoes ?? "",
          d.lines.map((L) => ({
            key: "",
            produtoVariacaoId: L.produtoVariacaoId,
            label: "",
            quantidade: L.quantidade,
            precoUnitario: L.precoUnitario,
            saldoRef: 0,
          })),
        ),
      );
      hydratedEditPedidoKeyRef.current = pedidoIdToLoad;
    })();
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
    void (async () => {
      const pagamentoAbrir = searchParams.get("pagamento") === "1";
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
        setVendedorId(d.vendedorId);
        setPedidoObservacoes(d.observacoes ?? "");
        setLines(
          d.lines.map((L) => ({
            key: clientRandomId(),
            produtoVariacaoId: L.produtoVariacaoId,
            label: L.label,
            quantidade: L.quantidade,
            precoUnitario: L.precoUnitario,
            saldoRef: L.saldoRef,
          })),
        );
        setSavedCartSnapshot(
          snapshotPedidoCart(
            d.clienteId ?? "",
            d.corretorId ?? "",
            d.vendedorId,
            d.observacoes ?? "",
            d.lines.map((L) => ({
              key: "",
              produtoVariacaoId: L.produtoVariacaoId,
              label: "",
              quantidade: L.quantidade,
              precoUnitario: L.precoUnitario,
              saldoRef: 0,
            })),
          ),
        );
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
      const p = detail.pedido;
      pedidoIdRef.current = p.id;
      setPedidoId(p.id);
      setClienteId(p.cliente?.id ?? "");
      const nomeCli = p.cliente ? clienteNomeCurto(p.cliente) : "";
      setClienteNomeResolvido(nomeCli);
      setClienteQuery(nomeCli);
      setVendedorId(p.vendedor.id);
      setCorretorId(p.corretor?.id ?? "");
      setPedidoObservacoes(p.observacoes ?? "");
      setLines(
        p.itens.map((it) => ({
          key: clientRandomId(),
          produtoVariacaoId: it.produtoVariacaoId,
          label: `${it.produtoVariacao.produto.nome} — ${it.produtoVariacao.nome}`,
          quantidade: it.quantidade,
          precoUnitario: it.precoUnitario.toFixed(2),
          saldoRef: 0,
        })),
      );
      setSavedCartSnapshot(
        snapshotPedidoCart(
          p.cliente?.id ?? "",
          p.corretor?.id ?? "",
          p.vendedor.id,
          p.observacoes ?? "",
          p.itens.map((it) => ({
            key: "",
            produtoVariacaoId: it.produtoVariacaoId,
            label: "",
            quantidade: it.quantidade,
            precoUnitario: it.precoUnitario.toFixed(2),
            saldoRef: 0,
          })),
        ),
      );

      if (
        pagamentoAbrir &&
        (p.estado === "EM_ABERTO" ||
          p.estado === "PAGO_PARCIAL" ||
          p.estado === "QUITADO")
      ) {
        const sum = await pdvGetResumoPagamentoPedido({
          storeId,
          pedidoId: p.id,
        });
        const totalCalc =
          p.total ??
          p.itens.reduce(
            (a, it) => a + it.quantidade * it.precoUnitario,
            0,
          );
        if ("ok" in sum && sum.ok) {
          setFinalizaResumo({
            totalPedido: sum.totalPedido,
            totalPago: sum.totalPago,
            pagamentos: sum.pagamentos,
          });
        } else {
          setFinalizaResumo({
            totalPedido: totalCalc,
            totalPago: 0,
            pagamentos: [],
          });
        }
        setTotalFinalizado(totalCalc);
        setPedidoFinalizadoId(p.id);
        setEntregaJaRegistadaNestaFinalizacao(Boolean(p.entregueEm));
        setPagamentoPainelSomenteLeitura(p.estado === "QUITADO");
        if (p.estado === "QUITADO") {
          setPedidoQuitadoResumo({
            storeName: detail.storeName,
            pedido: p,
          });
        } else {
          setPedidoQuitadoResumo(null);
        }
        setPdvStep("pagamento");
        setViewDetalhe(null);
        hydratedViewPedidoKeyRef.current = viewPedidoId;
        setViewLoading(false);
        return;
      }

      setViewDetalhe({
        storeName: detail.storeName,
        pedido: detail.pedido,
      });
      hydratedViewPedidoKeyRef.current = viewPedidoId;
      setViewLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, readOnly, viewPedidoId, storeId]);

  /** Remove `pagamento=1` da URL após abrir o painel (evita re-disparos estranhos ao refrescar). */
  React.useEffect(() => {
    if (
      pdvStep !== "pagamento" ||
      !pedidoFinalizadoId ||
      searchParams.get("pagamento") !== "1"
    ) {
      return;
    }
    const href = buildVendasHref(new URLSearchParams(searchParams.toString()), {
      pagamento: null,
    });
    router.replace(href, { scroll: false });
  }, [pdvStep, pedidoFinalizadoId, searchParams, router]);

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
        label: `${c.name} · corretor${c.isBlocked ? " (bloqueado)" : ""}`,
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

  const escolherLinha = (row: ClienteListaRow) => {
    if (row.kind === "cliente") {
      setClienteId(row.id);
      setClienteNomeResolvido(row.label);
      setClienteQuery(row.label);
      setClienteListaAberta(false);
      return;
    }
    void (async () => {
      setActionBusy(true);
      try {
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
      } finally {
        setActionBusy(false);
      }
    })();
  };

  const persistPedido = React.useCallback(async (): Promise<boolean> => {
    if (!pedidoId) return false;
    const r = await pdvSavePedido({
      storeId,
      pedidoId,
      clienteId: clienteId.trim() ? clienteId : null,
      vendedorId,
      corretorId: corretorId || null,
      observacoes: pedidoObservacoes || null,
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
    pedidoObservacoes,
    lines,
  ]);

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
    });
    if (!("ok" in r) || !r.ok) {
      toast.error("error" in r ? r.error : "Não foi possível criar o rascunho.");
      return false;
    }
    pedidoIdRef.current = r.pedidoId;
    setPedidoId(r.pedidoId);
    return true;
  }, [storeId, clienteId, vendedorId, corretorId]);

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
          key: clientRandomId(),
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

  const salvarEmAberto = () => {
    onClose();
  };

  const guardarRascunho = React.useCallback(() => {
    if (!pedidoId) {
      toast.message(
        "Ainda não há rascunho — adicione um produto para criar o pedido.",
      );
      return;
    }
    void (async () => {
      setActionBusy(true);
      try {
        const ok = await persistPedido();
        if (ok) {
          setSavedCartSnapshot(
            snapshotPedidoCart(
              clienteId,
              corretorId,
              vendedorId,
              pedidoObservacoes,
              lines,
            ),
          );
          toast.success("Rascunho guardado na loja.");
          onClose();
          router.refresh();
        }
      } finally {
        setActionBusy(false);
      }
    })();
  }, [
    pedidoId,
    persistPedido,
    clienteId,
    corretorId,
    vendedorId,
    pedidoObservacoes,
    lines,
    onClose,
    router,
  ]);

  const executarFinalizacaoEPassarPagamento =
    React.useCallback(async (): Promise<boolean> => {
      setActionBusy(true);
      try {
        if (!pedidoId) {
          toast.message("Ainda não há rascunho — adicione um produto.");
          return false;
        }
        if (lines.length === 0) {
          toast.error("Adicione pelo menos um item ao carrinho.");
          return false;
        }
        if (!clienteId.trim()) {
          toast.error("Selecione um comprador antes de concluir a venda.");
          return false;
        }
        const ok = await persistPedido();
        if (!ok) return false;
        setEntregaJaRegistadaNestaFinalizacao(false);
        const r = await pdvFinalizarPedido({ storeId, pedidoId });
        if ("error" in r && r.error) {
          toast.error(r.error);
          return false;
        }
        const sum = await pdvGetResumoPagamentoPedido({ storeId, pedidoId });
        const total = cartTotal(lines);
        if ("ok" in sum && sum.ok) {
          setFinalizaResumo({
            totalPedido: sum.totalPedido,
            totalPago: sum.totalPago,
            pagamentos: sum.pagamentos,
          });
        } else {
          setFinalizaResumo({
            totalPedido: total,
            totalPago: 0,
            pagamentos: [],
          });
        }
        setTotalFinalizado(total);
        setPedidoFinalizadoId(pedidoId);
        setPagamentoPainelSomenteLeitura(false);
        setPdvStep("pagamento");
        return true;
      } finally {
        setActionBusy(false);
      }
    }, [pedidoId, lines, clienteId, storeId, persistPedido]);

  const descartar = () => {
    if (!pedidoId) {
      onClose();
      return;
    }
    if (!window.confirm("Excluir este pedido em andamento?")) return;
    void (async () => {
      setActionBusy(true);
      try {
        const r = await pdvExcluirPedido({ storeId, pedidoId });
        if ("error" in r && r.error) {
          toast.error(r.error);
          return;
        }
        toast.message("Pedido em andamento removido.");
        onClose();
        router.refresh();
      } finally {
        setActionBusy(false);
      }
    })();
  };

  const totalFmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cartTotal(lines));


  const clienteListaVaziaComFiltro =
    clienteListaAberta &&
    queryTrim.length > 0 &&
    linhasClienteFiltradas.length === 0;

  /** Modo `view`: mesmo layout que edit, sem edição (ver query no topo do ficheiro). */
  const lockUi = readOnly && !viewLoading && Boolean(viewPedidoId);
  /** Só bloquear edição do comprador em modo leitura forçada (não por ter rascunho). */
  const clienteBloqueado = lockUi && Boolean(pedidoId && clienteId.trim());

  /** Após criar cliente pelo modal (redirect com `novoCliente` + `novoClienteNome`). */
  const aplicouNovoClienteRef = React.useRef<string>("");
  React.useEffect(() => {
    const nid = searchParams.get("novoCliente");
    const nNom = searchParams.get("novoClienteNome");
    if (!nid) {
      aplicouNovoClienteRef.current = "";
      return;
    }
    const dedupe = `${nid}|${nNom ?? ""}`;
    if (aplicouNovoClienteRef.current === dedupe) return;
    aplicouNovoClienteRef.current = dedupe;

    const hrefClean = buildVendasHref(new URLSearchParams(searchParams.toString()), {
      novoCliente: null,
      novoClienteNome: null,
    });

    if (lockUi) {
      router.replace(hrefClean, { scroll: false });
      return;
    }

    const fromList = clientes.find((c) => c.id === nid);
    const label = (fromList?.name ?? nNom ?? "").trim() || "Cliente";

    setClienteId(nid);
    setClienteNomeResolvido(label);
    setClienteQuery(label);
    setClienteListaAberta(false);
    if (!fromList) {
      setExtraClientes((prev) => [
        ...prev.filter((p) => p.id !== nid),
        { id: nid, name: label },
      ]);
    }

    router.replace(hrefClean, { scroll: false });
    toast.success("Cliente selecionado.");
  }, [searchParams, clientes, router, lockUi]);

  const flushObservacoesCarrinho = React.useCallback(async () => {
    if (!pedidoId || lockUi) return;
    const r = await pdvAtualizarObservacoesPedido({
      storeId,
      pedidoId,
      observacoes: pedidoObservacoes || null,
    });
    if ("error" in r && r.error) {
      toast.error(r.error);
      return;
    }
    setSavedCartSnapshot(
      snapshotPedidoCart(
        clienteId,
        corretorId,
        vendedorId,
        pedidoObservacoes,
        lines,
      ),
    );
  }, [
    pedidoId,
    lockUi,
    storeId,
    pedidoObservacoes,
    clienteId,
    corretorId,
    vendedorId,
    lines,
  ]);

  const flushObservacoesPainel = React.useCallback(async () => {
    const pid = pedidoFinalizadoId;
    if (!pid) return;
    const r = await pdvAtualizarObservacoesPedido({
      storeId,
      pedidoId: pid,
      observacoes: pedidoObservacoes || null,
    });
    if ("error" in r && r.error) {
      toast.error(r.error);
      return;
    }
    setPedidoQuitadoResumo((prev) =>
      prev && prev.pedido.id === pid
        ? {
            ...prev,
            pedido: {
              ...prev.pedido,
              observacoes: pedidoObservacoes || null,
            },
          }
        : prev,
    );
  }, [pedidoFinalizadoId, storeId, pedidoObservacoes]);
  const showResumoDetalhe = Boolean(viewDetalhe);
  const showCartGrid =
    !readOnly || (readOnly && Boolean(viewPedidoId) && !viewLoading);
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

  const cartDraftIsDirty = React.useMemo(() => {
    if (readOnly) return false;
    if (!pedidoId || pdvStep !== "cart" || showResumoDetalhe) return false;
    return (
      snapshotPedidoCart(
        clienteId,
        corretorId,
        vendedorId,
        pedidoObservacoes,
        lines,
      ) !== savedCartSnapshot
    );
  }, [
    readOnly,
    pedidoId,
    pdvStep,
    showResumoDetalhe,
    clienteId,
    corretorId,
    vendedorId,
    pedidoObservacoes,
    lines,
    savedCartSnapshot,
  ]);

  const handleDialogOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) return;
      if (pdvStep === "pagamento" && pedidoFinalizadoId) {
        salvarEmAberto();
        return;
      }
      if (cartDraftIsDirty) {
        if (
          !window.confirm(
            "Existem alterações no rascunho que ainda não gravou. Sair mesmo assim?",
          )
        ) {
          return;
        }
      }
      onClose();
    },
    [pdvStep, pedidoFinalizadoId, cartDraftIsDirty, onClose],
  );

  const handleEntregarPosFinalizar = React.useCallback(() => {
    if (!pedidoFinalizadoId) return;
    void (async () => {
      setActionBusy(true);
      try {
        const r = await pdvEntregarPedido({
          storeId,
          pedidoId: pedidoFinalizadoId,
        });
        if ("error" in r && r.error) {
          toast.error(r.error);
          return;
        }
        toast.success("Consignação registada.");
        onClose();
        router.refresh();
      } finally {
        setActionBusy(false);
      }
    })();
  }, [pedidoFinalizadoId, storeId, onClose, router]);

  const handleEntregarVerPedido = React.useCallback(() => {
    if (!viewDetalhe) return;
    const pid = viewDetalhe.pedido.id;
    void (async () => {
      setActionBusy(true);
      try {
        const r = await pdvEntregarPedido({ storeId, pedidoId: pid });
        if ("error" in r && r.error) {
          toast.error(r.error);
          return;
        }
        toast.success("Consignação registada.");
        if (viewPedidoId) {
          const nr = await fetchPedidoParaVerModal(viewPedidoId);
          if (nr.ok) {
            setViewDetalhe({
              storeName: nr.storeName,
              pedido: nr.pedido,
            });
          }
        }
        router.refresh();
      } finally {
        setActionBusy(false);
      }
    })();
  }, [viewDetalhe, storeId, viewPedidoId, router]);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={
          !(
            pdvStep === "pagamento" &&
            pedidoFinalizadoId &&
            !pagamentoPainelSomenteLeitura
          )
        }
        className={cn(
          "top-1/2 left-1/2 flex h-[min(80vh,calc(100dvh-2rem))] max-h-[min(80vh,calc(100dvh-2rem))] w-[min(80vw,calc(100vw-2rem))] max-w-[min(80vw,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden p-0",
          "[&_[data-slot=dialog-close]]:min-h-10 [&_[data-slot=dialog-close]]:min-w-10 [&_[data-slot=dialog-close]]:touch-manipulation",
        )}
      >
        {pdvStep === "pagamento" && pedidoFinalizadoId ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PdvVendaFinalizadaPanel
              storeId={storeId}
              pedidoId={pedidoFinalizadoId}
              lines={lines}
              totalPedido={
                finalizaResumo?.totalPedido ?? totalFinalizado
              }
              totalJaPago={finalizaResumo?.totalPago ?? 0}
              pagamentosLinhas={finalizaResumo?.pagamentos ?? []}
              actionBusy={actionBusy}
              onCancel={salvarEmAberto}
              somenteLeitura={pagamentoPainelSomenteLeitura}
              pedidoResumoCompleto={pedidoQuitadoResumo}
              cancelarLabel={
                pagamentoPainelSomenteLeitura ? "Fechar" : "Cancelar"
              }
              showEntregar={
                !pagamentoPainelSomenteLeitura &&
                !entregaJaRegistadaNestaFinalizacao
              }
              onEntregar={handleEntregarPosFinalizar}
              onPagamentoRegistado={() => {
                void (async () => {
                  const r = await pdvGetResumoPagamentoPedido({
                    storeId,
                    pedidoId: pedidoFinalizadoId,
                  });
                  if ("ok" in r && r.ok) {
                    setFinalizaResumo({
                      totalPedido: r.totalPedido,
                      totalPago: r.totalPago,
                      pagamentos: r.pagamentos,
                    });
                    const restante = r.totalPedido - r.totalPago;
                    if (restante <= 0.004) {
                      onClose();
                    }
                  }
                })();
              }}
              observacoes={pedidoObservacoes}
              onObservacoesChange={setPedidoObservacoes}
              onObservacoesBlur={() => {
                void flushObservacoesPainel();
              }}
            />
          </div>
        ) : (
          <>
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
              <div className="flex w-full flex-col items-stretch gap-2 sm:max-w-xs sm:shrink-0">
                <div className="flex flex-wrap items-center justify-start gap-2">
                  <PedidoEstadoBadge estado={viewDetalhe.pedido.estado} />
                  <Badge variant="outline">
                    {pedidoModalidadeLabels[viewDetalhe.pedido.modalidade]}
                  </Badge>
                </div>
                {viewDetalhe.pedido.estado === "EM_ANDAMENTO" ? (
                  <Link
                    href={buildVendasHref(spForLinks, {
                      pdv: "1",
                      edit: viewDetalhe.pedido.id,
                      view: null,
                    })}
                    className={cn(buttonVariants({ size: "sm" }), "w-fit")}
                  >
                    Editar no PDV
                  </Link>
                ) : null}
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
                  : "Escolha cliente e, se precisar, corretor. Salvar para continuar mais tarde; Finalizar venda baixa o stock e abre o passo de pagamento e consignação."}
              </DialogDescription>
            </DialogHeader>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
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
              "mb-4 border-b border-border pb-3",
              panelMutedClass,
              "px-3 py-2.5",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-foreground">{storeName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{fluxoLabel}</span>
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
                    concluir a venda (Finalizar venda).
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
                            <tr
                              key={L.key}
                              className={cn(
                                "bg-card",
                                L.saldoRef <= 0 &&
                                  "bg-destructive/10 dark:bg-destructive/15",
                              )}
                            >
                              <td className="px-2 py-1.5 align-middle sm:px-3 sm:py-2">
                                <span className="font-medium">{L.label}</span>
                                <span
                                  className={cn(
                                    "ml-2 text-[11px]",
                                    L.saldoRef <= 0
                                      ? "font-medium text-destructive"
                                      : "text-muted-foreground",
                                  )}
                                >
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
                      <div className="flex gap-2">
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
                          className="min-w-0 flex-1"
                        />
                        <ClienteNovoDialog
                          storeId={storeId}
                          corretores={corretores}
                          trigger="icon"
                          redirectAfterSave={clienteRedirectAfterSave}
                          disabled={lockUi}
                        />
                      </div>
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
                          Sem resultados — usa o botão ao lado{" "}
                          <span className="whitespace-nowrap">(ícone +)</span> para
                          cadastro completo (PF ou PJ).
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Clientes e corretores cadastrados aparecem na lista.
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
                    className="flex h-10 min-h-10 w-full rounded-md border border-input bg-transparent ps-3 pe-10 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={vendedorId}
                    disabled={
                      lockUi ||
                      (!!pedidoId && !pdvPodeAlterarVendedorComPedido)
                    }
                    onChange={(e) => setVendedorId(e.target.value)}
                  >
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  {pdvPodeAlterarVendedorComPedido && pedidoId && !lockUi ? (
                    <p className="text-[11px] text-muted-foreground">
                      Admin da marca ou gerente podem alterar o vendedor deste pedido
                      antes de finalizar.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pdv-corretor">Corretor (opcional)</Label>
                  <select
                    id="pdv-corretor"
                    className="flex h-10 min-h-10 w-full rounded-md border border-input bg-transparent ps-3 pe-10 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={corretorId}
                    disabled={lockUi}
                    onChange={(e) => setCorretorId(e.target.value)}
                  >
                    <option value="">—</option>
                    {corretores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.isBlocked ? " (bloqueado)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pdv-observacoes">Observações</Label>
                  <textarea
                    id="pdv-observacoes"
                    rows={3}
                    value={pedidoObservacoes}
                    onChange={(e) => setPedidoObservacoes(e.target.value)}
                    onFocus={() => {
                      pedidoObservacoesAoFocarRef.current = pedidoObservacoes;
                    }}
                    onBlur={() => {
                      if (pedidoObservacoesAoFocarRef.current === pedidoObservacoes) {
                        return;
                      }
                      void flushObservacoesCarrinho();
                    }}
                    disabled={lockUi || actionBusy}
                    placeholder="Notas sobre a venda (opcional)"
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
          </>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-muted/30 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {!showResumoDetalhe ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 justify-start text-destructive hover:text-destructive touch-manipulation"
                onClick={descartar}
                disabled={actionBusy || lockUi}
              >
                Descartar
              </Button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              {!viewDetalhe ? (
                <div className="flex w-full flex-wrap items-stretch justify-end gap-2 sm:w-auto sm:items-center [&_button]:min-h-10">
                  <VendaAcoesCliente
                    storeId={storeId}
                    pedidoId={pedidoId ?? ""}
                    totalPedido={cartTotal(lines)}
                    totalJaPago={0}
                    onSalvar={guardarRascunho}
                    salvarDisabled={actionBusy || lockUi || !pedidoId}
                    receberDisabled={
                      actionBusy ||
                      lockUi ||
                      !pedidoId ||
                      lines.length === 0 ||
                      !clienteId.trim()
                    }
                    receberDisabledTitle="Adicione itens, cliente e grave o rascunho antes de finalizar."
                    onReceberPreparar={async () => {
                      await executarFinalizacaoEPassarPagamento();
                    }}
                    showEntregar={false}
                    onPagamentoRegistado={() => {
                      router.refresh();
                    }}
                  />
                </div>
              ) : (
                <div className="flex w-full flex-wrap items-stretch justify-end gap-2 sm:w-auto sm:items-center [&_button]:min-h-10">
                  <VendaAcoesCliente
                    storeId={storeId}
                    pedidoId={viewDetalhe.pedido.id}
                    pedidoEstado={viewDetalhe.pedido.estado}
                    outlineButtonLabel="Fechar"
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
                    showEntregar={!viewDetalhe.pedido.entregueEm}
                    entregarDisabled={actionBusy}
                    entregarDisabledTitle="Aguarde."
                    onEntregar={handleEntregarVerPedido}
                    showReceber
                    receberDisabled={
                      actionBusy ||
                      !(
                        (viewDetalhe.pedido.estado === "EM_ABERTO" ||
                          viewDetalhe.pedido.estado === "PAGO_PARCIAL") &&
                        (viewDetalhe.pedido.total ?? 0) -
                          viewDetalhe.pedido.pagamentos.reduce(
                            (a, p) => a + p.valor,
                            0,
                          ) >
                          0.004
                      )
                    }
                    receberDisabledTitle={
                      viewDetalhe.pedido.estado === "EM_ANDAMENTO"
                        ? "Continue a venda em modo edição (Editar no PDV)."
                        : viewDetalhe.pedido.estado === "QUITADO" ||
                            viewDetalhe.pedido.estado === "CANCELADO"
                          ? "Pedido quitado ou cancelado."
                          : "Sem saldo em aberto neste pedido."
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
                          const p = r.pedido;
                          setLines(
                            p.itens.map((it) => ({
                              key: clientRandomId(),
                              produtoVariacaoId: it.produtoVariacaoId,
                              label: `${it.produtoVariacao.produto.nome} — ${it.produtoVariacao.nome}`,
                              quantidade: it.quantidade,
                              precoUnitario: it.precoUnitario.toFixed(2),
                              saldoRef: 0,
                            })),
                          );
                        }
                        router.refresh();
                      })();
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
