"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  criarBalancoEstoque,
  type BalancoActionErr,
  type CriarBalancoOk,
} from "@/modules/estoque/balanco-estoque-actions";

type Props = {
  stores: { id: string; name: string; kind: string }[];
  defaultStoreId: string | null;
};

export function BalancoEstoqueNovoForm({ stores, defaultStoreId }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    criarBalancoEstoque,
    null as CriarBalancoOk | BalancoActionErr | null,
  );

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.push(`/admin/estoque/balanco/${state.id}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="max-w-md space-y-4">
      {state && "error" in state && state.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="storeId-bal">Loja</Label>
        <select
          id="storeId-bal"
          name="storeId"
          required
          defaultValue={defaultStoreId ?? stores[0]?.id}
          className="flex h-10 w-full rounded-md border border-input bg-background ps-3 pe-10 py-2 text-sm"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="obs-bal">Observações (opcional)</Label>
        <Input id="obs-bal" name="observacoes" placeholder="Ex.: inventário trimestral" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "A criar…" : "Criar rascunho"}
      </Button>
    </form>
  );
}
