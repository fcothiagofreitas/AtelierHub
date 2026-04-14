"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  estoqueSaidaDefeito,
  type EstoqueActionResult,
} from "@/modules/estoque/actions/estoque-actions";

type Props = {
  stores: { id: string; name: string; kind: string }[];
  defaultStoreId: string | null;
};

export function EstoqueSaidaForm({ stores, defaultStoreId }: Props) {
  const [state, action, pending] = useActionState(estoqueSaidaDefeito, null as EstoqueActionResult | null);

  useEffect(() => {
    if (state?.ok) {
      const el = document.getElementById("ean-saida") as HTMLInputElement | null;
      if (el) el.value = "";
    }
  }, [state?.ok]);

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</div>
      )}
      {state?.ok && <p className="text-sm text-muted-foreground">Saída registada.</p>}
      <div className="space-y-1.5">
        <Label htmlFor="storeId-saida">Loja</Label>
        <select
          id="storeId-saida"
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
        <Label htmlFor="ean-saida">EAN-13</Label>
        <Input id="ean-saida" name="ean" placeholder="13 dígitos" inputMode="numeric" autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-saida">Quantidade</Label>
        <Input id="q-saida" name="quantidade" type="number" min={1} step={1} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motivo-saida">Motivo (opcional)</Label>
        <Input id="motivo-saida" name="motivo" placeholder="Ex.: defeito de fabrico" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "A registar…" : "Registar saída"}
      </Button>
    </form>
  );
}
