"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInputBrl } from "@/components/ui/money-input-brl";
import { cn } from "@/lib/utils";
import { upsertProduto } from "@/modules/catalogo/actions/produto-actions";
import {
  ProdutoVariacoesEditor,
  type CatalogoOption,
  type VariacaoDraft,
} from "./produto-variacoes-editor";

type Option = { id: string; nome: string; categoriaId?: string };

type OpcaoComGrade = CatalogoOption & { gradeTamanhoId: string };

type ProdutoFormProps = {
  produto?: {
    id: string;
    referencia: string | null;
    nome: string;
    descricao: string | null;
    precoVenda: number | null;
    categoriaId: string | null;
    subcategoriaId: string | null;
    tipoId: string | null;
    colecaoId: string | null;
    gradeTamanhoId: string | null;
    isActive: boolean;
    ncm: string | null;
    cest: string | null;
    origemMercadoria: number | null;
    unidadeTributavel: string | null;
    variacoes: VariacaoDraft[];
  } | null;
  categorias: Option[];
  subcategorias: { id: string; nome: string; categoriaId: string }[];
  tipos: Option[];
  colecoes: Option[];
  gradesTamanho: CatalogoOption[];
  opcoesTamanho: OpcaoComGrade[];
  catalogoCores: CatalogoOption[];
};

export function ProdutoForm({
  produto,
  categorias,
  subcategorias,
  tipos,
  colecoes,
  gradesTamanho,
  opcoesTamanho,
  catalogoCores,
}: ProdutoFormProps) {
  const [state, action, isPending] = useActionState(upsertProduto, null);

  const [gradeId, setGradeId] = useState(
    () => produto?.gradeTamanhoId ?? gradesTamanho[0]?.id ?? "",
  );

  const opcoesFiltradas = useMemo(
    () => opcoesTamanho.filter((o) => o.gradeTamanhoId === gradeId),
    [opcoesTamanho, gradeId],
  );

  const initialVariacoesMapped: VariacaoDraft[] | null = useMemo(() => {
    if (!produto) return null;
    return produto.variacoes.map((v, i) => ({
      id: v.id,
      opcaoTamanhoId: v.opcaoTamanhoId,
      corCatalogoId: v.corCatalogoId,
      ean13: v.ean13 ?? "",
      codigoExterno: v.codigoExterno ?? "",
      ordem: v.ordem ?? i,
    }));
  }, [produto]);

  /** Ao mudar a grade, só reaproveita linhas se for a mesma grade salva no produto. */
  const initialForVariacoes: VariacaoDraft[] = useMemo(() => {
    if (!produto || gradeId !== produto.gradeTamanhoId || !initialVariacoesMapped) {
      return [];
    }
    return initialVariacoesMapped;
  }, [produto, gradeId, initialVariacoesMapped]);

  const editorKey = `${gradeId}-${produto?.id ?? "new"}-${gradeId === produto?.gradeTamanhoId ? "same" : "changed"}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/catalogo/produtos"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para produtos
        </Link>
        <h2 className="mt-3 text-xl font-semibold">
          {produto ? "Editar produto" : "Novo produto"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha a grade de tamanhos (letras, números, etc.) e monte os SKUs com as opções dessa
          grade e as cores do catálogo.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <form action={action} className="space-y-8">
          {produto?.id && <input type="hidden" name="id" value={produto.id} />}
          <input type="hidden" name="gradeTamanhoId" value={gradeId} />

          {state?.error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Identificação</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="referencia">Referência (SKU pai)</Label>
                <Input
                  id="referencia"
                  name="referencia"
                  placeholder="Opcional"
                  defaultValue={produto?.referencia ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="precoVenda">Preço de venda (base)</Label>
                <MoneyInputBrl
                  id="precoVenda"
                  name="precoVenda"
                  defaultReais={produto?.precoVenda ?? null}
                  placeholder="Opcional"
                  invalid={Boolean(state?.fieldErrors?.precoVenda)}
                />
                {state?.fieldErrors?.precoVenda && (
                  <p className="text-xs text-destructive">{state.fieldErrors.precoVenda}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nome">Nome do produto</Label>
                <Input
                  id="nome"
                  name="nome"
                  required
                  defaultValue={produto?.nome ?? ""}
                  aria-invalid={Boolean(state?.fieldErrors?.nome)}
                />
                {state?.fieldErrors?.nome && (
                  <p className="text-xs text-destructive">{state.fieldErrors.nome}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <textarea
                  id="descricao"
                  name="descricao"
                  rows={3}
                  className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  )}
                  defaultValue={produto?.descricao ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="categoriaId">Categoria</Label>
                <select
                  id="categoriaId"
                  name="categoriaId"
                  defaultValue={produto?.categoriaId ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">—</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subcategoriaId">Subcategoria</Label>
                <select
                  id="subcategoriaId"
                  name="subcategoriaId"
                  defaultValue={produto?.subcategoriaId ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">—</option>
                  {subcategorias.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipoId">Tipo</Label>
                <select
                  id="tipoId"
                  name="tipoId"
                  defaultValue={produto?.tipoId ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">—</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="colecaoId">Coleção</Label>
                <select
                  id="colecaoId"
                  name="colecaoId"
                  defaultValue={produto?.colecaoId ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">—</option>
                  {colecoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="gradeTamanhoSelect">Grade de tamanhos</Label>
                  <Link
                    href="/admin/catalogo/tamanhos"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Gerenciar grades
                  </Link>
                </div>
                <select
                  id="gradeTamanhoSelect"
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">— Selecione —</option>
                  {gradesTamanho.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  As opções de tamanho (P, GG, 38…) vêm da grade escolhida.
                </p>
                {state?.fieldErrors?.gradeTamanhoId && (
                  <p className="text-xs text-destructive">{state.fieldErrors.gradeTamanhoId}</p>
                )}
              </div>
              <div className="flex items-end pb-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={produto?.isActive ?? true}
                    className="rounded border-input"
                  />
                  Ativo
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <h3 className="text-sm font-semibold">Informação fiscal</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="ncm">NCM</Label>
                <Input
                  id="ncm"
                  name="ncm"
                  placeholder="8 dígitos"
                  defaultValue={produto?.ncm ?? ""}
                  aria-invalid={Boolean(state?.fieldErrors?.ncm)}
                />
                {state?.fieldErrors?.ncm && (
                  <p className="text-xs text-destructive">{state.fieldErrors.ncm}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cest">CEST</Label>
                <Input
                  id="cest"
                  name="cest"
                  placeholder="7 dígitos"
                  defaultValue={produto?.cest ?? ""}
                  aria-invalid={Boolean(state?.fieldErrors?.cest)}
                />
                {state?.fieldErrors?.cest && (
                  <p className="text-xs text-destructive">{state.fieldErrors.cest}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="origemMercadoria">Origem (0–8)</Label>
                <Input
                  id="origemMercadoria"
                  name="origemMercadoria"
                  type="number"
                  min={0}
                  max={8}
                  placeholder="Opcional"
                  defaultValue={produto?.origemMercadoria ?? ""}
                  aria-invalid={Boolean(state?.fieldErrors?.origemMercadoria)}
                />
                {state?.fieldErrors?.origemMercadoria && (
                  <p className="text-xs text-destructive">{state.fieldErrors.origemMercadoria}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unidadeTributavel">Unidade tributável</Label>
                <Input
                  id="unidadeTributavel"
                  name="unidadeTributavel"
                  placeholder="Ex.: UN"
                  defaultValue={produto?.unidadeTributavel ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <ProdutoVariacoesEditor
              key={editorKey}
              opcoesTamanho={opcoesFiltradas}
              cores={catalogoCores}
              initial={initialForVariacoes}
              fieldErrors={state?.fieldErrors}
              gradeSelecionada={Boolean(gradeId)}
            />
            {state?.fieldErrors?.variacoes && (
              <p className="mt-2 text-xs text-destructive">{state.fieldErrors.variacoes}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-6">
            <Link href="/admin/catalogo/produtos" className={cn(buttonVariants({ variant: "outline" }))}>
              Cancelar
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Salvar produto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
