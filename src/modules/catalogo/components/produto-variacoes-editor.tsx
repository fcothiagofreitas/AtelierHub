"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNomeGrade } from "@/lib/produto-grade";
import { gerarProximoEan13 } from "@/modules/catalogo/actions/produto-actions";
import { cn } from "@/lib/utils";

export type CatalogoOption = { id: string; nome: string };

export type VariacaoDraft = {
  id?: string;
  opcaoTamanhoId: string;
  corCatalogoId: string;
  ean13: string;
  codigoExterno: string;
  ordem: number;
};

type Props = {
  opcoesTamanho: CatalogoOption[];
  cores: CatalogoOption[];
  initial: VariacaoDraft[];
  fieldErrors?: Partial<Record<string, string>>;
  gradeSelecionada: boolean;
};

export function ProdutoVariacoesEditor({
  opcoesTamanho,
  cores,
  initial,
  fieldErrors,
  gradeSelecionada,
}: Props) {
  const [rows, setRows] = useState<VariacaoDraft[]>(() =>
    initial.length > 0
      ? initial
      : [
          {
            opcaoTamanhoId: opcoesTamanho[0]?.id ?? "",
            corCatalogoId: cores[0]?.id ?? "",
            ean13: "",
            codigoExterno: "",
            ordem: 0,
          },
        ],
  );

  const nomePreview = useCallback(
    (row: VariacaoDraft) => {
      const t = opcoesTamanho.find((x) => x.id === row.opcaoTamanhoId)?.nome ?? "…";
      const c = cores.find((x) => x.id === row.corCatalogoId)?.nome ?? "…";
      return formatNomeGrade(t, c);
    },
    [opcoesTamanho, cores],
  );

  const jsonHidden = useMemo(() => JSON.stringify(rows), [rows]);

  const addRow = useCallback(() => {
    setRows((r) => [
      ...r,
      {
        opcaoTamanhoId: opcoesTamanho[0]?.id ?? "",
        corCatalogoId: cores[0]?.id ?? "",
        ean13: "",
        codigoExterno: "",
        ordem: r.length,
      },
    ]);
  }, [opcoesTamanho, cores]);

  const removeRow = useCallback((index: number) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, i) => i !== index)));
  }, []);

  const patch = useCallback((index: number, patch: Partial<VariacaoDraft>) => {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const onGerarEan = useCallback(
    async (index: number) => {
      const res = await gerarProximoEan13();
      if (res.ean13) {
        patch(index, { ean13: res.ean13 });
      }
    },
    [patch],
  );

  const catalogoVazio = !gradeSelecionada || opcoesTamanho.length === 0 || cores.length === 0;

  return (
    <div className="space-y-6">
      <input type="hidden" name="variacoes" value={jsonHidden} readOnly />

      {catalogoVazio && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          {!gradeSelecionada ? (
            <>Selecione a grade de tamanhos acima para carregar as opções (P, M, 38…).</>
          ) : opcoesTamanho.length === 0 ? (
            <>
              Esta grade ainda não tem opções cadastradas. Edite a grade em{" "}
              <a className="underline font-medium" href="/admin/catalogo/tamanhos">
                Grades de tamanhos
              </a>
              .
            </>
          ) : (
            <>
              Cadastre cores em{" "}
              <a className="underline font-medium" href="/admin/catalogo/cores">
                Cores
              </a>
              .
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Variações (SKUs)</Label>
          <p className="text-xs text-muted-foreground">
            Cada linha combina uma opção da grade escolhida com uma cor.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={catalogoVazio}
        >
          <Plus className="size-4" />
          Variação
        </Button>
      </div>

      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0 sm:grid-cols-2 lg:grid-cols-12"
          >
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="text-xs">Tamanho</Label>
              <select
                value={row.opcaoTamanhoId}
                onChange={(e) => patch(i, { opcaoTamanhoId: e.target.value })}
                disabled={catalogoVazio}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">—</option>
                {opcoesTamanho.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              {fieldErrors?.[`variacao_${i}_tamanho`] && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors[`variacao_${i}_tamanho`]}</p>
              )}
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="text-xs">Cor</Label>
              <select
                value={row.corCatalogoId}
                onChange={(e) => patch(i, { corCatalogoId: e.target.value })}
                disabled={catalogoVazio}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">—</option>
                {cores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              {fieldErrors?.[`variacao_${i}_cor`] && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors[`variacao_${i}_cor`]}</p>
              )}
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Label className="text-xs text-muted-foreground">Nome gerado</Label>
              <p className={cn("mt-1.5 rounded-md border border-dashed bg-background px-3 py-2 text-sm")}>
                {nomePreview(row)}
              </p>
            </div>
            <div className="lg:col-span-4">
              <Label className="text-xs">EAN-13</Label>
              <div className="flex gap-1">
                <Input
                  value={row.ean13}
                  onChange={(e) =>
                    patch(i, { ean13: e.target.value.replace(/\D/g, "").slice(0, 13) })
                  }
                  placeholder="13 dígitos"
                  inputMode="numeric"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="shrink-0"
                  title="Gerar EAN-13"
                  onClick={() => onGerarEan(i)}
                >
                  <Wand2 className="size-4" />
                </Button>
              </div>
              {fieldErrors?.[`variacao_${i}_ean13`] && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors[`variacao_${i}_ean13`]}</p>
              )}
            </div>
            <div className="lg:col-span-3">
              <Label className="text-xs">Código externo</Label>
              <Input
                value={row.codigoExterno}
                onChange={(e) => patch(i, { codigoExterno: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="flex items-end justify-end gap-1 lg:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={rows.length <= 1}
                onClick={() => removeRow(i)}
                title="Remover variação"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
