"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  estoqueEntradaManual,
  type EstoqueActionResult,
} from "@/modules/estoque/actions/estoque-actions";

type Props = {
  stores: { id: string; name: string; kind: string }[];
  defaultStoreId: string | null;
};

export function EstoqueEntradaForm({ stores, defaultStoreId }: Props) {
  const [state, action, pending] = useActionState(estoqueEntradaManual, null as EstoqueActionResult | null);

  useEffect(() => {
    if (state?.ok) {
      const el = document.getElementById("ean-entrada") as HTMLInputElement | null;
      if (el) el.value = "";
    }
  }, [state?.ok]);

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</div>
      )}
      {state?.ok && (
        <p className="text-sm text-muted-foreground">Entrada registada com sucesso.</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="storeId">Loja</Label>
        <select
          id="storeId"
          name="storeId"
          required
          defaultValue={defaultStoreId ?? stores[0]?.id}
          className="flex h-10 w-full rounded-md border border-input bg-background ps-3 pe-10 py-2 text-sm"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.kind === "ADMINISTRATIVE" ? " (admin.)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ean-entrada">EAN-13 (variação)</Label>
        <Input id="ean-entrada" name="ean" placeholder="13 dígitos" inputMode="numeric" autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-entrada">Quantidade</Label>
        <Input id="q-entrada" name="quantidade" type="number" min={1} step={1} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "A registar…" : "Registar entrada"}
      </Button>
    </form>
  );
}
