"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BalancoEstoqueEstado } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  cancelarBalancoEstoque,
  concluirBalancoEstoque,
  gravarContagensBalancoEstoque,
  importarItensBalancoEstoque,
  type BalancoActionErr,
} from "@/modules/estoque/balanco-estoque-actions";

type ItemRow = {
  id: string;
  saldoSnapshot: number;
  quantidadeContada: number | null;
  saldoNoFecho: number | null;
  deltaAplicado: number | null;
  produtoVariacao: {
    nome: string;
    ean13: string | null;
    produto: { nome: string; referencia: string | null };
    opcaoTamanho: { nome: string } | null;
    corCatalogo: { nome: string } | null;
  };
};

type Props = {
  balancoId: string;
  numero: number;
  estado: BalancoEstoqueEstado;
  podeEditar: boolean;
  itens: ItemRow[];
};

type ActionState = { ok?: boolean; error?: string } | null;

function foldResult(r: { ok: true } | BalancoActionErr): ActionState {
  if ("error" in r) return { error: r.error };
  return { ok: true };
}

export function BalancoEstoqueDetailPanel({ balancoId, numero, estado, podeEditar, itens }: Props) {
  const router = useRouter();
  const rascunho = estado === "RASCUNHO";

  const [impState, impAction, impPending] = useActionState(
    async (_: ActionState, fd: FormData) => foldResult(await importarItensBalancoEstoque(fd)),
    null as ActionState,
  );
  const [saveState, saveAction, savePending] = useActionState(
    async (_: ActionState, fd: FormData) => foldResult(await gravarContagensBalancoEstoque(fd)),
    null as ActionState,
  );
  const [doneState, doneAction, donePending] = useActionState(
    async (_: ActionState, fd: FormData) => foldResult(await concluirBalancoEstoque(fd)),
    null as ActionState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    async (_: ActionState, fd: FormData) => foldResult(await cancelarBalancoEstoque(fd)),
    null as ActionState,
  );

  useEffect(() => {
    if (impState?.ok || saveState?.ok || doneState?.ok || cancelState?.ok) {
      router.refresh();
    }
  }, [impState?.ok, saveState?.ok, doneState?.ok, cancelState?.ok, router]);

  return (
    <div className="space-y-8">
      {podeEditar && rascunho && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">Importar linhas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cria linhas a partir dos registos de saldo da loja (uma linha por SKU com movimento de stock).
          </p>
          {impState?.error && (
            <p className="mt-2 text-sm text-destructive">{impState.error}</p>
          )}
          {impState?.ok && <p className="mt-2 text-sm text-muted-foreground">Linhas importadas.</p>}
          <form action={impAction} className="mt-4 flex flex-wrap items-end gap-4">
            <input type="hidden" name="balancoId" value={balancoId} />
            <div className="flex items-center gap-2">
              <input
                id="apenasPos"
                name="apenasSaldoPositivo"
                type="checkbox"
                defaultChecked
                className="size-4 rounded border-input"
              />
              <Label htmlFor="apenasPos" className="text-sm font-normal">
                Apenas SKUs com saldo &gt; 0
              </Label>
            </div>
            <Button type="submit" variant="secondary" disabled={impPending}>
              {impPending ? "A importar…" : "Importar do sistema"}
            </Button>
          </form>
        </section>
      )}

      {itens.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sem linhas. Importe a partir do saldo ou volte mais tarde.
        </p>
      )}

      {itens.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">EAN</th>
                <th className="px-4 py-3 text-right font-medium">Saldo na importação</th>
                {estado === "CONCLUIDO" && (
                  <>
                    <th className="px-4 py-3 text-right font-medium">Saldo no fecho</th>
                    <th className="px-4 py-3 text-right font-medium">Contagem</th>
                    <th className="px-4 py-3 text-right font-medium">Ajuste aplicado</th>
                  </>
                )}
                {rascunho && (
                  <th className="px-4 py-3 text-right font-medium">Contagem física</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.map((it) => (
                <tr key={it.id} className="bg-card">
                  <td className="px-4 py-3">
                    <span className="font-medium">{it.produtoVariacao.produto.nome}</span>
                    {it.produtoVariacao.produto.referencia && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({it.produtoVariacao.produto.referencia})
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {[it.produtoVariacao.corCatalogo?.nome, it.produtoVariacao.opcaoTamanho?.nome]
                        .filter(Boolean)
                        .join(" · ") || it.produtoVariacao.nome}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{it.produtoVariacao.ean13 ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{it.saldoSnapshot}</td>
                  {estado === "CONCLUIDO" && (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums">{it.saldoNoFecho ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {it.quantidadeContada ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {it.deltaAplicado === null ? "—" : it.deltaAplicado}
                      </td>
                    </>
                  )}
                  {rascunho && (
                    <td className="px-4 py-3 text-right">
                      {podeEditar ? (
                        <input
                          name={`q_${it.id}`}
                          form="form-contagens"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={it.quantidadeContada ?? ""}
                          className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-right tabular-nums text-sm"
                          placeholder="—"
                        />
                      ) : (
                        <span className="tabular-nums text-muted-foreground">
                          {it.quantidadeContada ?? "—"}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {podeEditar && rascunho && itens.length > 0 && (
        <div className="space-y-2">
          {saveState?.error && (
            <p className="text-sm text-destructive">{saveState.error}</p>
          )}
          {saveState?.ok && (
            <p className="text-sm text-muted-foreground">Contagens gravadas.</p>
          )}
          <form id="form-contagens" action={saveAction} className="flex flex-wrap gap-3">
            <input type="hidden" name="balancoId" value={balancoId} />
            <Button type="submit" variant="secondary" disabled={savePending}>
              {savePending ? "A gravar…" : "Gravar contagens"}
            </Button>
          </form>
        </div>
      )}

      {podeEditar && rascunho && itens.length > 0 && (
        <div className="flex flex-wrap items-start gap-4 border-t pt-6">
          <div>
            {doneState?.error && (
              <p className="mb-2 text-sm text-destructive">{doneState.error}</p>
            )}
            <form action={doneAction} className="inline">
              <input type="hidden" name="balancoId" value={balancoId} />
              <Button type="submit" disabled={donePending}>
                {donePending ? "A concluir…" : "Concluir balanço"}
              </Button>
            </form>
            <p className="mt-2 max-w-md text-xs text-muted-foreground">
              Ao concluir, o sistema ajusta o stock para igualar à contagem em cada linha (movimentos{" "}
              <span className="font-mono">AJUSTE_CONFERENCIA</span>, motivo{" "}
              <span className="font-mono">Balanço #{numero}</span>).
            </p>
          </div>
          <div>
            {cancelState?.error && (
              <p className="mb-2 text-sm text-destructive">{cancelState.error}</p>
            )}
            <form action={cancelAction}>
              <input type="hidden" name="balancoId" value={balancoId} />
              <Button type="submit" variant="outline" disabled={cancelPending}>
                {cancelPending ? "A cancelar…" : "Cancelar rascunho"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {estado === "CANCELADO" && (
        <p className="text-sm text-muted-foreground">
          Este documento foi cancelado.{" "}
          <Link href="/admin/estoque/balanco" className="text-primary underline-offset-4 hover:underline">
            Voltar à lista
          </Link>
        </p>
      )}
    </div>
  );
}
