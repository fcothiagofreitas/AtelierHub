"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCatalogoCorRapido, type CorRapidaResult } from "@/modules/catalogo/actions/catalogo-tc-actions";
import { Badge } from "@/components/ui/badge";

export type CorRow = {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  isActive: boolean;
};

export function CoresQuickAddClient({ initialRows }: { initialRows: CorRow[] }) {
  const router = useRouter();
  const nomeRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(addCatalogoCorRapido, {} as CorRapidaResult);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      queueMicrotask(() => nomeRef.current?.focus());
    }
  }, [state, router]);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Adicionar cores</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe o nome e clique em Adicionar. Repita quantas vezes quiser; ao terminar, use
            &quot;Ir para a lista&quot;.
          </p>
        </div>

        <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="cor-nome">Nome da cor</Label>
            <Input
              ref={nomeRef}
              id="cor-nome"
              name="nome"
              placeholder="Ex.: Azul-marinho"
              required
              autoComplete="off"
              aria-invalid={Boolean(state?.fieldErrors?.nome)}
            />
            {state?.fieldErrors?.nome && (
              <p className="text-xs text-destructive">{state.fieldErrors.nome}</p>
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="cor-slug" className="text-muted-foreground">
              Slug (opcional)
            </Label>
            <Input id="cor-slug" name="slug" placeholder="Gerado do nome se vazio" autoComplete="off" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Adicionar"}
          </Button>
        </form>

        {state?.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Cor adicionada ao catálogo.</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Cores no catálogo</h3>
        {initialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center">
            Nenhuma cor ainda — use o formulário acima.
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-left font-medium">Ordem</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialRows.map((r) => (
                  <tr key={r.id} className="bg-card">
                    <td className="px-4 py-3 font-medium">{r.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.slug}</td>
                    <td className="px-4 py-3">{r.ordem}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.isActive ? "secondary" : "outline"}>
                        {r.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
